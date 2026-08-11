import json
import logging
import re
from collections import Counter
from datetime import datetime, timezone
from time import perf_counter
from typing import Callable, TypedDict

from langgraph.graph import END, StateGraph
from sqlalchemy.orm import Session

from app import vector_store
from app.config import settings
from app.mesh_client import get_mesh_llm
from app.models import (
    AgentRun,
    AgentRunStep,
    Enrollment,
    Event,
    MeshCallLog,
    Product,
    Recommendation,
    RecommendationItem,
    User,
)

logger = logging.getLogger(__name__)

BASE_MEANINGFUL_EVENT_TYPES = (
    "product_view",
    "search",
    "course_card_click",
    "enroll_click",
    "search_result_click",
    "recommendation_click",
)
# Kept separately because a time-on-page event is only meaningful after its
# dwell threshold has been checked in ``is_meaningful_event`` below.
MEANINGFUL_EVENT_TYPES = (*BASE_MEANINGFUL_EVENT_TYPES, "time_on_page")
RETRIEVE_N = 6
RETRIEVAL_BUFFER = 12
RELEVANCE_DISTANCE_THRESHOLD = 1.3
MAX_RECOMMENDED_ITEMS = 3

# A page visit only counts as genuine interest once dwell crosses this floor —
# a 2-second bounce shouldn't weigh the same as a considered read.
DWELL_QUALIFYING_SECONDS = 20
DWELL_MAX_WEIGHT = 4
PROFILE_EVENT_LIMIT = 180
COURSE_SESSION_WINDOW_SECONDS = 10 * 60

# These are interest points, not raw event counts. A card click followed by
# its product view is one course-opening session; genuine dwell and enrollment
# add stronger evidence.
OPEN_EVENT_WEIGHTS = {
    "product_view": 1.0,
    "course_card_click": 1.2,
    "search_result_click": 1.5,
    "recommendation_click": 1.5,
}
ENROLL_EVENT_WEIGHT = 4.0
SEARCH_EVENT_WEIGHT = 1.0


def _dwell_seconds(event: Event) -> int:
    if not event.event_metadata:
        return 0
    try:
        return int(json.loads(event.event_metadata).get("seconds", 0))
    except (json.JSONDecodeError, TypeError, ValueError):
        return 0


def is_meaningful_event(event: Event) -> bool:
    """Return whether an event is strong enough to influence an agent run.

    The database still retains short dwell events for analytics, but they must
    not count toward the recommendation trigger or the interest profile.
    """
    if event.event_type == "time_on_page":
        return _dwell_seconds(event) >= DWELL_QUALIFYING_SECONDS
    return event.event_type in BASE_MEANINGFUL_EVENT_TYPES


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _elapsed_ms(started_at: float) -> int:
    return round((perf_counter() - started_at) * 1000)


def _error_message(error: Exception) -> str:
    return f"{type(error).__name__}: {error}"[:1_000]


def _state_snapshot(state: "AgentState") -> dict:
    """Keep replay useful without persisting raw prompts or browser metadata."""
    snapshot: dict = {}
    for key in ("trigger_reason", "interest_summary", "query", "relevance_ok", "retry_count", "recommendation_id"):
        if key in state:
            snapshot[key] = state[key]
    if state.get("learner_profile"):
        snapshot["learner_profile"] = state["learner_profile"]
    if state.get("evidence"):
        snapshot["evidence"] = state["evidence"]
    if state.get("retrieved"):
        snapshot["retrieved"] = [
            {
                "product_id": item.get("product_id"),
                "title": item.get("title"),
                "distance": round(float(item["distance"]), 4) if item.get("distance") is not None else None,
            }
            for item in state["retrieved"]
        ]
    if state.get("excluded_enrolled"):
        snapshot["excluded_enrolled"] = state["excluded_enrolled"]
    if state.get("recommended_items"):
        retrieved_titles = {item.get("product_id"): item.get("title") for item in state.get("retrieved", [])}
        snapshot["recommended_items"] = [
            {
                "product_id": item.get("product_id"),
                "title": retrieved_titles.get(item.get("product_id")),
                "rank": item.get("rank"),
                "reason": item.get("reason"),
            }
            for item in state["recommended_items"]
        ]
    if state.get("narrative"):
        snapshot["narrative_length"] = len(state["narrative"])
    return snapshot


def _trace_node(
    db: Session,
    agent_run_id: int,
    step_name: str,
    node: Callable[["AgentState"], dict],
) -> Callable[["AgentState"], dict]:
    """Wrap a graph node with durable timing and state-summary telemetry.

    Deliberately does not commit here. Each commit is a full network round trip
    to Postgres (~1s measured against the deployed Neon instance); committing
    per step across 6-8 steps was single-handedly responsible for ~20s of the
    ~22s a recommendation run took. Every step is `db.add()`-ed (or mutated
    in-place on the same Python object) and left pending in the session;
    `run_agent` performs exactly one commit for the whole run.
    """

    def traced(state: "AgentState") -> dict:
        step = AgentRunStep(
            agent_run_id=agent_run_id,
            step_name=step_name,
            status="running",
            input_snapshot=_state_snapshot(state),
        )
        db.add(step)
        started_at = perf_counter()

        try:
            update = node(state)
        except Exception as error:
            step.status = "failed"
            step.error_message = _error_message(error)
            step.completed_at = _utcnow()
            step.latency_ms = _elapsed_ms(started_at)
            raise

        step.status = "completed"
        step.output_snapshot = _state_snapshot(update or {})
        step.completed_at = _utcnow()
        step.latency_ms = _elapsed_ms(started_at)
        return update

    return traced


def _first_int(*values: object) -> int | None:
    for value in values:
        if value is None or isinstance(value, bool):
            continue
        try:
            return int(value)
        except (TypeError, ValueError):
            continue
    return None


def _mesh_response_details(response) -> tuple[str | None, int | None, int | None, int | None, dict]:
    """Normalize LangChain's provider metadata into stable Agent Ops fields."""
    response_metadata = getattr(response, "response_metadata", {}) or {}
    usage_metadata = getattr(response, "usage_metadata", {}) or {}
    token_usage = response_metadata.get("token_usage", {}) or {}

    prompt_tokens = _first_int(usage_metadata.get("input_tokens"), token_usage.get("prompt_tokens"))
    completion_tokens = _first_int(usage_metadata.get("output_tokens"), token_usage.get("completion_tokens"))
    total_tokens = _first_int(usage_metadata.get("total_tokens"), token_usage.get("total_tokens"))
    resolved_model = response_metadata.get("model_name") or response_metadata.get("model")
    metadata = {
        key: response_metadata[key]
        for key in ("finish_reason", "system_fingerprint", "service_tier")
        if response_metadata.get(key) is not None
    }
    return resolved_model, prompt_tokens, completion_tokens, total_tokens, metadata


class AgentState(TypedDict, total=False):
    agent_run_id: int
    trigger_reason: str
    interest_summary: str
    evidence: list[str]
    learner_profile: dict
    query: str
    excluded_product_ids: list[int]
    excluded_enrolled: list[dict]
    retrieved: list[dict]
    relevance_ok: bool
    retry_count: int
    narrative: str
    recommended_items: list[dict]
    recommendation_id: int


def _enrolled_products(db: Session, user: User) -> list[Product]:
    """Learning context is useful; recommending a course already owned is not."""
    return (
        db.query(Product)
        .join(Enrollment, Enrollment.product_id == Product.id)
        .filter(Enrollment.user_id == user.id)
        .order_by(Enrollment.created_at.desc())
        .all()
    )


def _event_time(event: Event) -> datetime:
    created_at = event.created_at
    return created_at.replace(tzinfo=timezone.utc) if created_at.tzinfo is None else created_at


def _recency_weight(event: Event) -> float:
    """Recent behaviour should have more influence than an old browsing burst."""
    age_days = max(0.0, (_utcnow() - _event_time(event)).total_seconds() / 86_400)
    if age_days <= 1:
        return 1.0
    if age_days <= 7:
        return 0.8
    if age_days <= 30:
        return 0.55
    return 0.35


def _dwell_interest_points(seconds: int) -> float:
    """Dwell starts at the qualifying threshold and caps before it dominates."""
    return round(min(float(DWELL_MAX_WEIGHT), 1.0 + seconds / 45), 2)


def _format_points(value: float) -> str:
    return f"{value:.1f}".rstrip("0").rstrip(".")


def _event_action(event: Event) -> str:
    if event.event_type == "time_on_page":
        return f"{_dwell_seconds(event)}s dwell"
    return {
        "product_view": "viewed",
        "course_card_click": "explored",
        "search_result_click": "opened from search",
        "recommendation_click": "followed recommendation",
        "enroll_click": "enrolled",
    }.get(event.event_type, event.event_type.replace("_", " "))


def _ingest_activity(db: Session, user: User):
    def node(state: AgentState) -> dict:
        enrolled_products = _enrolled_products(db, user)
        excluded_product_ids = [product.id for product in enrolled_products]
        candidate_events = (
            db.query(Event)
            .filter(Event.user_id == user.id, Event.event_type.in_(MEANINGFUL_EVENT_TYPES))
            .order_by(Event.created_at.desc())
            # Fetch extra rows because short dwell events are retained for
            # analytics but filtered from agent reasoning below.
            .limit(PROFILE_EVENT_LIMIT)
            .all()
        )
        # Process in chronological order so adjacent click/view events can be
        # folded into one course-opening session.
        events = sorted((event for event in candidate_events if is_meaningful_event(event)), key=_event_time)

        # One batched lookup instead of one round trip per event (was ~1s each
        # against the deployed Postgres — the dominant cost of this node).
        product_ids = {e.product_id for e in events if e.product_id}
        products_by_id = (
            {p.id: p for p in db.query(Product).filter(Product.id.in_(product_ids)).all()}
            if product_ids
            else {}
        )

        # `sessions_by_product` avoids counting a card click plus its immediate
        # product-view event as two independent preferences.
        sessions_by_product: dict[int, list[dict]] = {}
        search_stats: dict[str, dict] = {}
        search_last_seen: dict[str, datetime] = {}

        for event in events:
            event_time = _event_time(event)
            if event.event_type == "search" and event.search_query:
                term = event.search_query.strip()
                canonical = term.casefold()
                if not canonical:
                    continue
                # Repeated submits of the same query in a short window are one intent.
                if canonical in search_last_seen and (event_time - search_last_seen[canonical]).total_seconds() <= COURSE_SESSION_WINDOW_SECONDS:
                    continue
                search_last_seen[canonical] = event_time
                stat = search_stats.setdefault(canonical, {"term": term, "interest_points": 0.0, "count": 0, "last_seen": event_time})
                stat["interest_points"] += SEARCH_EVENT_WEIGHT * _recency_weight(event)
                stat["count"] += 1
                stat["last_seen"] = event_time
                continue

            if not event.product_id or event.product_id not in products_by_id:
                continue

            product_sessions = sessions_by_product.setdefault(event.product_id, [])
            if product_sessions and (event_time - product_sessions[-1]["last_seen"]).total_seconds() <= COURSE_SESSION_WINDOW_SECONDS:
                session = product_sessions[-1]
            else:
                session = {"last_seen": event_time, "scores": {}, "actions": [], "max_dwell_seconds": 0}
                product_sessions.append(session)

            if event.event_type == "time_on_page":
                raw_points, signal_kind = _dwell_interest_points(_dwell_seconds(event)), "dwell"
                session["max_dwell_seconds"] = max(session["max_dwell_seconds"], _dwell_seconds(event))
            elif event.event_type == "enroll_click":
                raw_points, signal_kind = ENROLL_EVENT_WEIGHT, "enroll"
            else:
                raw_points, signal_kind = OPEN_EVENT_WEIGHTS.get(event.event_type, 1.0), "open"

            # Keep the strongest signal of each kind within this visit session.
            session["scores"][signal_kind] = max(
                session["scores"].get(signal_kind, 0.0), raw_points * _recency_weight(event)
            )
            action = _event_action(event)
            if action not in session["actions"]:
                session["actions"].append(action)
            session["last_seen"] = event_time

        category_scores: Counter[str] = Counter()
        course_engagements: list[dict] = []
        for product_id, sessions in sessions_by_product.items():
            product = products_by_id[product_id]
            interest_points = round(sum(sum(session["scores"].values()) for session in sessions), 2)
            actions = [action for session in sessions for action in session["actions"]]
            dwell_seconds = max((session["max_dwell_seconds"] for session in sessions), default=0)
            last_seen = max(session["last_seen"] for session in sessions)
            category_scores[product.category] += interest_points
            course_engagements.append(
                {
                    "product_id": product.id,
                    "title": product.title,
                    "category": product.category,
                    "interest_points": interest_points,
                    "actions": actions[:4],
                    "dwell_seconds": dwell_seconds or None,
                    "last_seen": last_seen.isoformat(),
                    "enrolled": product.id in excluded_product_ids,
                }
            )

        focus = [
            {"name": category, "interest_points": round(points, 2)}
            for category, points in category_scores.most_common(3)
        ]
        course_engagements.sort(key=lambda item: (-item["interest_points"], item["title"]))
        engaged_courses = course_engagements[:4]
        search_intent = sorted(search_stats.values(), key=lambda item: (-item["interest_points"], item["term"]))[:3]
        enrolled_context = [
            {"product_id": product.id, "title": product.title, "category": product.category, "level": product.level}
            for product in enrolled_products[:4]
        ]

        summary_parts: list[str] = []
        if focus:
            summary_parts.append(
                "Primary learning focus: "
                + ", ".join(f"{item['name']} ({_format_points(item['interest_points'])} interest points)" for item in focus)
                + "."
            )
        if engaged_courses:
            strongest = engaged_courses[0]
            activity = f"spent {strongest['dwell_seconds']}s on" if strongest["dwell_seconds"] else "explored"
            summary_parts.append(f"Strongest recent engagement: {activity} {strongest['title']}.")
        if search_intent:
            summary_parts.append("Search intent: " + ", ".join(item["term"] for item in search_intent) + ".")
        if enrolled_context:
            summary_parts.append(
                "Current learning context: " + ", ".join(item["title"] for item in enrolled_context) + ". These are excluded from recommendations."
            )

        query_parts = ["Next-step courses"]
        if focus:
            query_parts.append("for " + " and ".join(item["name"] for item in focus[:2]))
        if engaged_courses:
            query_parts.append("building from " + ", ".join(item["title"] for item in engaged_courses[:2]))
        if search_intent:
            query_parts.append("with focus on " + ", ".join(item["term"] for item in search_intent[:2]))
        if enrolled_context:
            query_parts.append("beyond enrolled foundations " + ", ".join(item["title"] for item in enrolled_context[:2]))
        query = "; ".join(query_parts) if len(query_parts) > 1 else "popular courses"

        evidence: list[str] = []
        if focus:
            evidence.append(f"focus: {focus[0]['name']} ({_format_points(focus[0]['interest_points'])} interest points)")
        if engaged_courses:
            strongest = engaged_courses[0]
            evidence.append(
                f"{strongest['dwell_seconds']}s engaged with {strongest['title']}"
                if strongest["dwell_seconds"]
                else f"explored {strongest['title']}"
            )
        if search_intent:
            evidence.append(f"searched \"{search_intent[0]['term']}\"")
        if enrolled_context:
            evidence.append(f"building beyond enrolled {enrolled_context[0]['title']}")

        learner_profile = {
            "focus": focus,
            "engaged_courses": engaged_courses,
            "search_intent": [
                {**item, "interest_points": round(item["interest_points"], 2), "last_seen": item["last_seen"].isoformat()}
                for item in search_intent
            ],
            "enrolled_courses": enrolled_context,
        }
        return {
            "interest_summary": " ".join(summary_parts) or "New learner with no meaningful activity yet.",
            "evidence": evidence[:4],
            "learner_profile": learner_profile,
            "query": query,
            "excluded_product_ids": excluded_product_ids,
        }

    return node


def _retrieve(db: Session):
    def node(state: AgentState) -> dict:
        excluded = set(state.get("excluded_product_ids", []))
        target_n = RETRIEVE_N if state.get("retry_count", 0) == 0 else RETRIEVE_N + 4
        # Hard-filter enrollments before the LLM sees candidates. Over-fetch so
        # the eligible candidate set remains useful even for active learners.
        n_results = target_n + max(RETRIEVAL_BUFFER, len(excluded))
        res = vector_store.query_products(state["query"], n_results=n_results)
        retrieved = []
        excluded_enrolled = []
        ids = res.get("ids", [[]])[0]
        metadatas = res.get("metadatas", [[]])[0]
        distances = res.get("distances", [[]])[0]
        for pid, meta, dist in zip(ids, metadatas, distances):
            product_id = int(pid)
            if product_id in excluded:
                excluded_enrolled.append({"product_id": product_id, "title": meta.get("title"), "distance": dist})
                continue
            retrieved.append({"product_id": product_id, "title": meta.get("title"), "distance": dist})
            if len(retrieved) >= target_n:
                break
        return {"retrieved": retrieved, "excluded_enrolled": excluded_enrolled}

    return node


def _grade_relevance(state: AgentState) -> dict:
    retrieved = state.get("retrieved", [])
    retry_count = state.get("retry_count", 0)
    best_distance = min((r["distance"] for r in retrieved), default=999.0)
    ok = bool(retrieved) and (best_distance < RELEVANCE_DISTANCE_THRESHOLD or retry_count >= 1)
    return {"relevance_ok": ok, "retry_count": retry_count + 1}


def _route_after_grade(state: AgentState) -> str:
    return "generate_narrative" if state.get("relevance_ok") else "refine_query"


def _refine_query(state: AgentState) -> dict:
    # Broaden deliberately to the strongest verified theme instead of keeping
    # the first words of a sentence such as "Next-step courses".
    focus = state.get("learner_profile", {}).get("focus", [])
    primary_theme = focus[0].get("name") if focus else None
    broadened = f"next-step {primary_theme} courses" if primary_theme else "popular courses"
    return {"query": broadened}


NARRATIVE_SYSTEM_PROMPT = """You are the Growise recommendation agent for an online course marketplace. \
You write short, honest, specific next-step recommendations grounded strictly in the learner profile and \
the real candidate courses provided to you. Never invent courses, facts, goals, or numbers. Avoid generic \
marketing fluff. Treat enrolled courses as learning context: they are never eligible recommendations, but \
use them to recommend a sensible next, deeper, or adjacent skill. Do not recommend duplicate foundations. \
Reference explicit learner evidence or a concrete relationship to an enrolled foundation in each reason.

Respond with ONLY a JSON object of this exact shape, no markdown fences:
{"narrative": "2-3 sentence recommendation intro, written to the user in second person", \
"items": [{"product_id": <int>, "reason": "one sentence, specific, references their behavior"}]}

Pick at most 3 courses from the candidates, ordered by relevance. Prefer a useful learning path over three \
near-identical picks; return fewer than three if the candidate set does not support a distinct next step."""


def _course_candidate_context(product: Product) -> str:
    """Give the model enough curriculum context to choose a real next step, not just a title match."""
    content = product.course_content or {}
    headline = str(content.get("headline") or "")[:180]
    overview = str(content.get("overview") or "")[:360]
    outcomes = content.get("outcomes") or []
    outcome_text = "; ".join(str(outcome)[:120] for outcome in outcomes[:3])
    details = [
        f"id={product.id}",
        f"title={product.title}",
        f"category={product.category}",
        f"level={product.level}",
        f"price=${product.price}",
        f"tags={product.tags or 'none'}",
        f"description={product.description[:420]}",
    ]
    if headline:
        details.append(f"course focus={headline}")
    if overview:
        details.append(f"curriculum overview={overview}")
    if outcome_text:
        details.append(f"outcomes={outcome_text}")
    return " | ".join(details)


def _generate_narrative(db: Session):
    def node(state: AgentState) -> dict:
        retrieved = state.get("retrieved", [])[:RETRIEVE_N]
        retrieved_ids = [r["product_id"] for r in retrieved]
        products_by_id = (
            {p.id: p for p in db.query(Product).filter(Product.id.in_(retrieved_ids)).all()}
            if retrieved_ids
            else {}
        )
        # Preserve retrieval order/ranking rather than DB row order.
        candidates = [products_by_id[pid] for pid in retrieved_ids if pid in products_by_id]

        if not candidates:
            return {"narrative": "", "recommended_items": []}

        candidate_text = "\n".join(f"- {_course_candidate_context(product)}" for product in candidates)
        profile = state.get("learner_profile", {})
        enrolled_context = profile.get("enrolled_courses", [])
        enrolled_text = (
            "\n".join(
                f"- id={item.get('product_id')} | {item.get('title')} | {item.get('category')} | {item.get('level')}"
                for item in enrolled_context
            )
            or "- none"
        )
        user_prompt = (
            f"Learner profile summary:\n{state['interest_summary']}\n\n"
            f"Explicit evidence:\n" + "\n".join(f"- {item}" for item in state.get("evidence", [])) + "\n\n"
            f"Already enrolled courses (context only; never recommend):\n{enrolled_text}\n\n"
            f"Eligible candidate courses (grounded catalog; pick only from these):\n{candidate_text}"
        )

        llm = get_mesh_llm().bind(response_format={"type": "json_object"})
        mesh_started_at = perf_counter()
        try:
            response = llm.invoke(
                [
                    {"role": "system", "content": NARRATIVE_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ]
            )
        except Exception as error:
            db.add(
                MeshCallLog(
                    agent_run_id=state["agent_run_id"],
                    step_name="generate_narrative",
                    requested_model=settings.mesh_model,
                    status="failed",
                    latency_ms=_elapsed_ms(mesh_started_at),
                    error_message=_error_message(error),
                )
            )
            raise

        resolved_model, prompt_tokens, completion_tokens, total_tokens, response_metadata = _mesh_response_details(
            response
        )
        db.add(
            MeshCallLog(
                agent_run_id=state["agent_run_id"],
                step_name="generate_narrative",
                requested_model=settings.mesh_model,
                resolved_model=resolved_model,
                status="succeeded",
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                latency_ms=_elapsed_ms(mesh_started_at),
                response_metadata=response_metadata or None,
            )
        )

        content = response.content if isinstance(response.content, str) else str(response.content)
        parsed = _parse_llm_json(content)

        valid_ids = {p.id for p in candidates}
        items = []
        for rank, item in enumerate(parsed.get("items", [])[:MAX_RECOMMENDED_ITEMS], start=1):
            pid = item.get("product_id")
            if pid in valid_ids:
                items.append({"product_id": pid, "rank": rank, "reason": item.get("reason", "")})

        return {"narrative": parsed.get("narrative", ""), "recommended_items": items}

    return node


def _parse_llm_json(content: str) -> dict:
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        logger.warning("Could not parse agent JSON output: %s", content[:200])
        return {"narrative": "", "items": []}


def _persist(db: Session, user: User):
    def node(state: AgentState) -> dict:
        if not state.get("recommended_items"):
            return {}

        db.query(Recommendation).filter(
            Recommendation.user_id == user.id, Recommendation.is_active.is_(True)
        ).update({"is_active": False})

        rec = Recommendation(
            user_id=user.id,
            agent_run_id=state.get("agent_run_id"),
            narrative=state["narrative"],
            trigger_reason=state.get("trigger_reason", ""),
            evidence=json.dumps(state.get("evidence", [])),
            is_active=True,
        )
        db.add(rec)
        db.flush()

        for item in state["recommended_items"]:
            db.add(
                RecommendationItem(
                    recommendation_id=rec.id,
                    product_id=item["product_id"],
                    rank=item["rank"],
                    reason=item["reason"],
                )
            )
        return {"recommendation_id": rec.id}

    return node


def build_graph(db: Session, user: User, agent_run_id: int):
    graph = StateGraph(AgentState)
    graph.add_node("ingest_activity", _trace_node(db, agent_run_id, "analyze_interest", _ingest_activity(db, user)))
    graph.add_node("retrieve", _trace_node(db, agent_run_id, "retrieve_catalog", _retrieve(db)))
    graph.add_node("grade_relevance", _trace_node(db, agent_run_id, "evaluate_relevance", _grade_relevance))
    graph.add_node("refine_query", _trace_node(db, agent_run_id, "refine_query", _refine_query))
    graph.add_node(
        "generate_narrative",
        _trace_node(db, agent_run_id, "generate_narrative", _generate_narrative(db)),
    )
    graph.add_node("persist", _trace_node(db, agent_run_id, "store_recommendation", _persist(db, user)))

    graph.set_entry_point("ingest_activity")
    graph.add_edge("ingest_activity", "retrieve")
    graph.add_edge("retrieve", "grade_relevance")
    graph.add_conditional_edges(
        "grade_relevance",
        _route_after_grade,
        {"generate_narrative": "generate_narrative", "refine_query": "refine_query"},
    )
    graph.add_edge("refine_query", "retrieve")
    graph.add_edge("generate_narrative", "persist")
    graph.add_edge("persist", END)

    return graph.compile()


def run_agent(db: Session, user: User, trigger_reason: str) -> Recommendation | None:
    """Run the graph and commit exactly once for the whole run.

    Every node below only `db.add()`s or mutates already-pending objects; the
    only two round trips are the flush here (needed to resolve `agent_run.id`
    for the steps' foreign keys) and the single commit at the end (success or
    failure), instead of a network round trip per graph step.
    """
    agent_run = AgentRun(user_id=user.id, trigger_reason=trigger_reason, status="running")
    db.add(agent_run)
    db.flush()
    agent_run_id = agent_run.id
    run_started_at = perf_counter()
    graph = build_graph(db, user, agent_run_id)
    try:
        result = graph.invoke(
            {"agent_run_id": agent_run_id, "trigger_reason": trigger_reason, "retry_count": 0}
        )
    except Exception as error:
        agent_run.status = "failed"
        agent_run.error_message = _error_message(error)
        agent_run.completed_at = _utcnow()
        agent_run.latency_ms = _elapsed_ms(run_started_at)
        db.commit()
        logger.exception("Agent run failed for user %s (trigger=%s)", user.id, trigger_reason)
        return None

    rec_id = result.get("recommendation_id")
    agent_run.status = "completed" if rec_id is not None else "no_result"
    agent_run.interest_summary = result.get("interest_summary")
    agent_run.retrieval_query = result.get("query")
    agent_run.completed_at = _utcnow()
    agent_run.latency_ms = _elapsed_ms(run_started_at)
    db.commit()
    return db.get(Recommendation, rec_id) if rec_id is not None else None
