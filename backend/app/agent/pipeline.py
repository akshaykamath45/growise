import json
import logging
import re
from collections import Counter
from typing import TypedDict

from langgraph.graph import END, StateGraph
from sqlalchemy.orm import Session

from app import vector_store
from app.mesh_client import get_mesh_llm
from app.models import Event, Product, Recommendation, RecommendationItem, User

logger = logging.getLogger(__name__)

MEANINGFUL_EVENT_TYPES = ("product_view", "search", "course_card_click", "enroll_click")
RETRIEVE_N = 6
RELEVANCE_DISTANCE_THRESHOLD = 1.3
MAX_RECOMMENDED_ITEMS = 3


class AgentState(TypedDict, total=False):
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
        events = (
            db.query(Event)
            .filter(Event.user_id == user.id, Event.event_type.in_(MEANINGFUL_EVENT_TYPES))
            .order_by(Event.created_at.desc())
            .limit(60)
            .all()
        )

        category_counts: Counter[str] = Counter()
        search_terms: list[str] = []
        viewed_titles: list[str] = []

        for e in events:
            if e.product_id:
                product = db.get(Product, e.product_id)
                if product:
                    category_counts[product.category] += 1
                    if e.event_type in ("product_view", "course_card_click") and product.title not in viewed_titles:
                        viewed_titles.append(product.title)
            if e.event_type == "search" and e.search_query and e.search_query not in search_terms:
                search_terms.append(e.search_query)

        top_categories = [c for c, _ in category_counts.most_common(3)]
        viewed_titles = viewed_titles[:5]
        search_terms = search_terms[:5]

        summary_parts = []
        if top_categories:
            breakdown = ", ".join(f"{c} ({category_counts[c]} events)" for c in top_categories)
            summary_parts.append(f"Most active categories: {breakdown}.")
        if search_terms:
            summary_parts.append(f"Recent searches: {', '.join(search_terms)}.")
        if viewed_titles:
            summary_parts.append(f"Recently viewed courses: {', '.join(viewed_titles)}.")

        evidence = []
        if top_categories:
            evidence.append(f"{category_counts[top_categories[0]]} events in {top_categories[0]}")
        for term in search_terms[:2]:
            evidence.append(f'searched "{term}"')
        if viewed_titles:
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
        response = llm.invoke(
            [
                {"role": "system", "content": NARRATIVE_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ]
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


def build_graph(db: Session, user: User):
    graph = StateGraph(AgentState)
    graph.add_node("ingest_activity", _ingest_activity(db, user))
    graph.add_node("retrieve", _retrieve(db))
    graph.add_node("grade_relevance", _grade_relevance)
    graph.add_node("refine_query", _refine_query)
    graph.add_node("generate_narrative", _generate_narrative(db))
    graph.add_node("persist", _persist(db, user))

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
    graph = build_graph(db, user)
    try:
        result = graph.invoke({"trigger_reason": trigger_reason, "retry_count": 0})
    except Exception:
        logger.exception("Agent run failed for user %s (trigger=%s)", user.id, trigger_reason)
        return None
    rec_id = result.get("recommendation_id")
    if rec_id is None:
        return None
    return db.get(Recommendation, rec_id)
