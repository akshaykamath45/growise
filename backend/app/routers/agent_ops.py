import json
from math import ceil
from datetime import datetime, timezone
from statistics import mean

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_admin
from app.database import get_db
from app.models import AgentRun, Event, MeshCallLog, Product, Recommendation, User
from app.services import product_service

router = APIRouter(prefix="/api/admin/agent-ops", tags=["agent-ops"])


def _start_of_today() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def _parse_metadata(event: Event) -> dict | None:
    try:
        return json.loads(event.event_metadata) if event.event_metadata else None
    except json.JSONDecodeError:
        return None


def _event_detail(event: Event) -> str:
    product_title = event.product.title if event.product else None
    metadata = _parse_metadata(event) or {}
    if event.event_type == "search":
        return f'Searched “{event.search_query or ""}”'
    if event.event_type == "time_on_page":
        seconds = metadata.get("seconds")
        return f"{seconds}s on {product_title}" if seconds else f"Time on {product_title or 'a course'}"
    if product_title:
        return product_title
    return event.event_type.replace("_", " ").title()


def _user_label(user: User | None, user_id: int) -> str:
    """Emails are intentionally exposed only from admin-protected endpoints."""
    return user.email if user else f"learner-{user_id}"


def _recommendation_id(event: Event) -> int | None:
    metadata = _parse_metadata(event) or {}
    value = metadata.get("recommendation_id")
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _event_out(event: Event) -> dict:
    metadata = _parse_metadata(event) or {}
    return {
        "id": event.id,
        "created_at": event.created_at,
        "user_id": event.user_id,
        "user_label": _user_label(event.user, event.user_id),
        "event_type": event.event_type,
        "detail": _event_detail(event),
        "product_id": event.product_id,
        "product_title": event.product.title if event.product else None,
        "search_query": event.search_query,
        "dwell_seconds": metadata.get("seconds") if event.event_type == "time_on_page" else None,
        "recommendation_id": _recommendation_id(event),
    }


def _run_out(run: AgentRun) -> dict:
    return {
        "id": run.id,
        "user_id": run.user_id,
        "user_label": _user_label(run.user, run.user_id),
        "status": run.status,
        "trigger_reason": run.trigger_reason,
        "interest_summary": run.interest_summary,
        "retrieval_query": run.retrieval_query,
        "latency_ms": run.latency_ms,
        "started_at": run.started_at,
        "completed_at": run.completed_at,
        "recommendation_id": run.recommendation.id if run.recommendation else None,
    }


@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    today = _start_of_today()
    calls = db.query(MeshCallLog).filter(MeshCallLog.created_at >= today).all()
    latencies = sorted(call.latency_ms for call in calls if call.latency_ms is not None)
    today_events = db.query(Event).filter(Event.created_at >= today).all()
    recommendation_count = db.query(Recommendation).filter(Recommendation.created_at >= today).count()
    recommendation_click_ids = {
        recommendation_id
        for event in today_events
        if event.event_type == "recommendation_click"
        if (recommendation_id := _recommendation_id(event)) is not None
    }
    recommendation_enrollment_ids = {
        recommendation_id
        for event in today_events
        if event.event_type == "enroll_click"
        if (recommendation_id := _recommendation_id(event)) is not None
    }
    p95_latency = latencies[ceil(len(latencies) * 0.95) - 1] if latencies else 0
    return {
        "tokens_used_today": sum(call.total_tokens or 0 for call in calls),
        "active_models": sorted({call.resolved_model or call.requested_model for call in calls}),
        "requests_routed": len(calls),
        "avg_latency_ms": round(mean(latencies)) if latencies else 0,
        "p95_latency_ms": p95_latency,
        "agent_runs_today": db.query(AgentRun).filter(AgentRun.started_at >= today).count(),
        "events_today": len(today_events),
        "recommendations_today": recommendation_count,
        "recommendation_clicks_today": len(recommendation_click_ids),
        "recommendation_enrollments_today": len(recommendation_enrollment_ids),
        "recommendation_click_rate": round((len(recommendation_click_ids) / recommendation_count) * 100, 1)
        if recommendation_count
        else 0,
        "recommendation_enrollment_rate": round(
            (len(recommendation_enrollment_ids) / len(recommendation_click_ids)) * 100, 1
        )
        if recommendation_click_ids
        else 0,
    }


@router.get("/events")
def get_live_events(
    limit: int = Query(default=30, ge=1, le=100),
    event_type: str | None = None,
    user_id: int | None = None,
    product_id: int | None = None,
    query: str | None = Query(default=None, max_length=255),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    events_query = db.query(Event).options(joinedload(Event.product), joinedload(Event.user))
    if event_type:
        events_query = events_query.filter(Event.event_type == event_type)
    if user_id:
        events_query = events_query.filter(Event.user_id == user_id)
    if product_id:
        events_query = events_query.filter(Event.product_id == product_id)
    if query:
        like = f"%{query}%"
        events_query = events_query.outerjoin(Product).filter(
            or_(Product.title.ilike(like), Event.search_query.ilike(like))
        )
    events = events_query.order_by(Event.created_at.desc()).limit(limit).all()
    return [_event_out(event) for event in events]


@router.get("/runs")
def get_agent_runs(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    runs = (
        db.query(AgentRun)
        .options(joinedload(AgentRun.recommendation), joinedload(AgentRun.user))
        .order_by(AgentRun.started_at.desc())
        .limit(limit)
        .all()
    )
    return [_run_out(run) for run in runs]


@router.get("/runs/{run_id}")
def get_agent_run_detail(
    run_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    run = (
        db.query(AgentRun)
        .options(
            joinedload(AgentRun.recommendation).joinedload(Recommendation.items),
            joinedload(AgentRun.user),
            joinedload(AgentRun.steps),
            joinedload(AgentRun.mesh_calls),
        )
        .filter(AgentRun.id == run_id)
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail="Agent run not found")

    payload = _run_out(run)
    payload["error_message"] = run.error_message
    stored_items = {
        item.product_id: {"title": item.product.title, "reason": item.reason}
        for item in (run.recommendation.items if run.recommendation else [])
    }

    def enriched_snapshot(snapshot: dict | None) -> dict | None:
        if not snapshot or not snapshot.get("recommended_items"):
            return snapshot
        enriched = dict(snapshot)
        enriched["recommended_items"] = [
            {
                **item,
                "title": item.get("title") or stored_items.get(item.get("product_id"), {}).get("title"),
                "reason": item.get("reason") or stored_items.get(item.get("product_id"), {}).get("reason"),
            }
            for item in snapshot["recommended_items"]
        ]
        return enriched

    payload["steps"] = [
        {
            "id": step.id,
            "step_name": step.step_name,
            "status": step.status,
            "latency_ms": step.latency_ms,
            "input_snapshot": enriched_snapshot(step.input_snapshot),
            "output_snapshot": enriched_snapshot(step.output_snapshot),
            "error_message": step.error_message,
        }
        for step in run.steps
    ]
    payload["mesh_calls"] = [
        {
            "id": call.id,
            "step_name": call.step_name,
            "endpoint": call.endpoint,
            "requested_model": call.requested_model,
            "resolved_model": call.resolved_model,
            "status": call.status,
            "prompt_tokens": call.prompt_tokens,
            "completion_tokens": call.completion_tokens,
            "total_tokens": call.total_tokens,
            "latency_ms": call.latency_ms,
            "cache_hit": call.cache_hit,
            "routing_attempts": call.routing_attempts,
            "routing_fallback": call.routing_fallback,
            "response_metadata": call.response_metadata,
            "error_message": call.error_message,
        }
        for call in run.mesh_calls
    ]
    return payload


@router.get("/catalog-health")
def get_catalog_health(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    total_courses = db.query(Product).count()
    synced_courses = db.query(Product).filter(Product.vector_synced.is_(True)).count()
    failed_sync_courses = (
        db.query(Product)
        .filter(Product.vector_synced.is_(False), Product.vector_sync_error.is_not(None))
        .count()
    )
    pending_sync_courses = total_courses - synced_courses - failed_sync_courses
    return {
        "total_courses": total_courses,
        "synced_courses": synced_courses,
        "pending_sync_courses": pending_sync_courses,
        "failed_sync_courses": failed_sync_courses,
        "retrieval_coverage_percent": round((synced_courses / total_courses) * 100, 1) if total_courses else 100,
    }


@router.post("/catalog-health/retry")
def retry_catalog_sync(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    retried = product_service.resync_pending_products(db)
    return {"retried_courses": retried, **get_catalog_health(db, _)}
