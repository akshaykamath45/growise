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
from app.models import AgentRun, AgentRunStep, Event, MeshCallLog, Product, Recommendation, RecommendationItem, User

logger = logging.getLogger(__name__)

BASE_MEANINGFUL_EVENT_TYPES = (
    "product_view",
    "search",
    "course_card_click",
    "enroll_click",
    "search_result_click",
)
# Kept separately because a time-on-page event is only meaningful after its
# dwell threshold has been checked in ``is_meaningful_event`` below.
MEANINGFUL_EVENT_TYPES = (*BASE_MEANINGFUL_EVENT_TYPES, "time_on_page")
RETRIEVE_N = 6
RELEVANCE_DISTANCE_THRESHOLD = 1.3
MAX_RECOMMENDED_ITEMS = 3

# A page visit only counts as genuine interest once dwell crosses this floor —
# a 2-second bounce shouldn't weigh the same as a considered read.
DWELL_QUALIFYING_SECONDS = 20
DWELL_MAX_WEIGHT = 3

EVENT_WEIGHTS = {
    "product_view": 1,
    "course_card_click": 1,
    "search_result_click": 1,
    "enroll_click": 3,
}


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
    """Wrap a graph node with durable timing and state-summary telemetry."""

    def traced(state: "AgentState") -> dict:
        step = AgentRunStep(
            agent_run_id=agent_run_id,
            step_name=step_name,
            status="running",
            input_snapshot=_state_snapshot(state),
        )
        db.add(step)
        db.commit()
        step_id = step.id
        started_at = perf_counter()

        try:
            update = node(state)
        except Exception as error:
            db.rollback()
            failed_step = db.get(AgentRunStep, step_id)
            if failed_step:
                failed_step.status = "failed"
                failed_step.error_message = _error_message(error)
                failed_step.completed_at = _utcnow()
                failed_step.latency_ms = _elapsed_ms(started_at)
                db.commit()
            raise

        completed_step = db.get(AgentRunStep, step_id)
        if completed_step:
            completed_step.status = "completed"
            completed_step.output_snapshot = _state_snapshot(update or {})
            completed_step.completed_at = _utcnow()
            completed_step.latency_ms = _elapsed_ms(started_at)
            db.commit()
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
    query: str
    retrieved: list[dict]
    relevance_ok: bool
    retry_count: int
    narrative: str
    recommended_items: list[dict]
    recommendation_id: int


def _ingest_activity(db: Session, user: User):
    def node(state: AgentState) -> dict:
        candidate_events = (
            db.query(Event)
            .filter(Event.user_id == user.id, Event.event_type.in_(MEANINGFUL_EVENT_TYPES))
            .order_by(Event.created_at.desc())
            # Fetch extra rows because short dwell events are retained for
            # analytics but filtered from agent reasoning below.
            .limit(120)
            .all()
        )
        events = [event for event in candidate_events if is_meaningful_event(event)][:60]

        category_counts: Counter[str] = Counter()
        search_terms: list[str] = []
        viewed_titles: list[str] = []
        best_dwell: tuple[str, int] | None = None  # (title, seconds) of the longest qualifying dwell

        for e in events:
            if e.product_id:
                product = db.get(Product, e.product_id)
                if product:
                    if e.event_type == "time_on_page":
                        seconds = _dwell_seconds(e)
                        if seconds >= DWELL_QUALIFYING_SECONDS:
                            weight = min(DWELL_MAX_WEIGHT, seconds // DWELL_QUALIFYING_SECONDS)
                            category_counts[product.category] += weight
                            if best_dwell is None or seconds > best_dwell[1]:
                                best_dwell = (product.title, seconds)
                    else:
                        category_counts[product.category] += EVENT_WEIGHTS.get(e.event_type, 1)
                        if (
                            e.event_type in ("product_view", "course_card_click", "search_result_click")
                            and product.title not in viewed_titles
                        ):
                            viewed_titles.append(product.title)
            if e.event_type == "search" and e.search_query and e.search_query not in search_terms:
                search_terms.append(e.search_query)

        top_categories = [c for c, _ in category_counts.most_common(3)]
        viewed_titles = viewed_titles[:5]
        search_terms = search_terms[:5]

        summary_parts = []
        if top_categories:
            breakdown = ", ".join(f"{c} ({category_counts[c]} signals)" for c in top_categories)
            summary_parts.append(f"Most active categories: {breakdown}.")
        if search_terms:
            summary_parts.append(f"Recent searches: {', '.join(search_terms)}.")
        if viewed_titles:
            summary_parts.append(f"Recently viewed courses: {', '.join(viewed_titles)}.")
        if best_dwell:
            summary_parts.append(f"Spent {best_dwell[1]}s reading {best_dwell[0]}, suggesting real interest.")

        evidence = []
        if top_categories:
            evidence.append(f"{category_counts[top_categories[0]]} signals in {top_categories[0]}")
        for term in search_terms[:2]:
            evidence.append(f'searched "{term}"')
        if best_dwell:
            evidence.append(f"spent {best_dwell[1]}s on {best_dwell[0]}")
        elif viewed_titles:
            evidence.append(f"viewed {viewed_titles[0]}")

        return {
            "interest_summary": " ".join(summary_parts) or "New user with minimal activity so far.",
            "evidence": evidence[:4],
            "query": " ".join(top_categories + search_terms + viewed_titles) or "popular courses",
        }

    return node


def _retrieve(db: Session):
    def node(state: AgentState) -> dict:
        n_results = RETRIEVE_N if state.get("retry_count", 0) == 0 else RETRIEVE_N + 4
        res = vector_store.query_products(state["query"], n_results=n_results)
        retrieved = []
        ids = res.get("ids", [[]])[0]
        metadatas = res.get("metadatas", [[]])[0]
        distances = res.get("distances", [[]])[0]
        for pid, meta, dist in zip(ids, metadatas, distances):
            retrieved.append({"product_id": int(pid), "title": meta.get("title"), "distance": dist})
        return {"retrieved": retrieved}

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
    # Broaden the query: drop specific titles/search terms, keep only the dominant category signal.
    words = state["query"].split()
    broadened = " ".join(words[:2]) if words else "popular courses"
    return {"query": broadened}


NARRATIVE_SYSTEM_PROMPT = """You are the Growise recommendation agent for an online course marketplace. \
You write short, honest, specific recommendation copy grounded strictly in the user's real browsing \
behavior and the real courses provided to you. Never invent courses, facts, or numbers that were not \
given to you. Avoid generic marketing fluff - reference the specific behavior that led to each pick.

Respond with ONLY a JSON object of this exact shape, no markdown fences:
{"narrative": "2-3 sentence recommendation intro, written to the user in second person", \
"items": [{"product_id": <int>, "reason": "one sentence, specific, references their behavior"}]}

Pick at most 3 courses from the candidates, ordered by relevance."""


def _generate_narrative(db: Session):
    def node(state: AgentState) -> dict:
        retrieved = state.get("retrieved", [])
        candidates = []
        for r in retrieved[:RETRIEVE_N]:
            product = db.get(Product, r["product_id"])
            if product:
                candidates.append(product)

        if not candidates:
            return {"narrative": "", "recommended_items": []}

        candidate_text = "\n".join(
            f"- id={p.id} | {p.title} | {p.category} | {p.level} | ${p.price} | {p.description}"
            for p in candidates
        )
        user_prompt = (
            f"User activity summary: {state['interest_summary']}\n\n"
            f"Candidate courses (grounded catalog, pick only from these):\n{candidate_text}"
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
            db.commit()
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
        db.commit()
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
    agent_run = AgentRun(user_id=user.id, trigger_reason=trigger_reason, status="running")
    db.add(agent_run)
    db.commit()
    agent_run_id = agent_run.id
    run_started_at = perf_counter()
    graph = build_graph(db, user, agent_run_id)
    try:
        result = graph.invoke(
            {"agent_run_id": agent_run_id, "trigger_reason": trigger_reason, "retry_count": 0}
        )
    except Exception as error:
        db.rollback()
        failed_run = db.get(AgentRun, agent_run_id)
        if failed_run:
            failed_run.status = "failed"
            failed_run.error_message = _error_message(error)
            failed_run.completed_at = _utcnow()
            failed_run.latency_ms = _elapsed_ms(run_started_at)
            db.commit()
        logger.exception("Agent run failed for user %s (trigger=%s)", user.id, trigger_reason)
        return None

    rec_id = result.get("recommendation_id")
    completed_run = db.get(AgentRun, agent_run_id)
    if completed_run:
        completed_run.status = "completed" if rec_id is not None else "no_result"
        completed_run.interest_summary = result.get("interest_summary")
        completed_run.retrieval_query = result.get("query")
        completed_run.completed_at = _utcnow()
        completed_run.latency_ms = _elapsed_ms(run_started_at)
        db.commit()
    return db.get(Recommendation, rec_id) if rec_id is not None else None
