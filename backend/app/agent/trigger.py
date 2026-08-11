from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.agent.pipeline import MEANINGFUL_EVENT_TYPES, is_meaningful_event
from app.config import settings
from app.models import Event, Recommendation, User


def get_active_recommendation(db: Session, user: User) -> Recommendation | None:
    return (
        db.query(Recommendation)
        .filter(Recommendation.user_id == user.id, Recommendation.is_active.is_(True))
        .order_by(Recommendation.created_at.desc())
        .first()
    )


def _meaningful_event_count(
    db: Session, user: User, created_after: datetime | None = None
) -> int:
    """Count only events which are eligible to influence recommendations.

    ``time_on_page`` is stored even for short visits, so its duration cannot be
    evaluated solely in SQL. Filtering the small, user-scoped result here keeps
    the trigger in lockstep with the agent's own interest analysis.
    """
    query = db.query(Event).filter(
        Event.user_id == user.id,
        Event.event_type.in_(MEANINGFUL_EVENT_TYPES),
    )
    if created_after is not None:
        query = query.filter(Event.created_at > created_after)
    return sum(1 for event in query.all() if is_meaningful_event(event))


def should_regenerate(db: Session, user: User) -> tuple[bool, str]:
    """Decide whether the agent should re-run for this user right now.

    Efficiency gate: never call the LLM per-event. Only regenerate when there's
    real new signal (enough new meaningful events) and a cooldown has passed —
    otherwise serve the cached recommendation.
    """
    event_count = _meaningful_event_count(db, user)
    if event_count == 0:
        return False, "no_signal"

    last_rec = get_active_recommendation(db, user)
    if last_rec is None:
        return True, "first_recommendation"

    last_created = last_rec.created_at
    if last_created.tzinfo is None:
        last_created = last_created.replace(tzinfo=timezone.utc)

    new_events = _meaningful_event_count(db, user, created_after=last_created)
    cooldown_elapsed = datetime.now(timezone.utc) - last_created > timedelta(
        minutes=settings.recommendation_cooldown_minutes
    )

    if new_events >= settings.recommendation_min_new_events and cooldown_elapsed:
        return True, f"{new_events}_new_events"
    return False, "cached"
