import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Event, User
from app.schemas import ActivityEventOut, EventBatchIn

router = APIRouter(prefix="/api/events", tags=["events"])

MAX_EVENTS_PER_BATCH = 100
MAX_EVENTS_FOR_SIGNAL = 12


def _event_out(event: Event) -> ActivityEventOut:
    try:
        metadata = json.loads(event.event_metadata) if event.event_metadata else None
    except json.JSONDecodeError:
        metadata = None
    return ActivityEventOut(
        id=event.id,
        event_type=event.event_type,
        product_id=event.product_id,
        product_title=event.product.title if event.product else None,
        search_query=event.search_query,
        metadata=metadata,
        created_at=event.created_at,
    )


@router.get("/me", response_model=list[ActivityEventOut])
def get_my_recent_events(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    events = (
        db.query(Event)
        .options(joinedload(Event.product))
        .filter(Event.user_id == user.id)
        .order_by(Event.created_at.desc())
        .limit(MAX_EVENTS_FOR_SIGNAL)
        .all()
    )
    return [_event_out(event) for event in events]


@router.post("/batch", status_code=202)
def ingest_events(
    batch: EventBatchIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not user.tracking_opt_in:
        return {"accepted": 0, "reason": "tracking_opted_out"}

    events = batch.events[:MAX_EVENTS_PER_BATCH]
    rows = [
        Event(
            user_id=user.id,
            event_type=e.event_type,
            product_id=e.product_id,
            search_query=e.search_query,
            event_metadata=json.dumps(e.metadata) if e.metadata else None,
            **({"created_at": e.client_ts} if e.client_ts else {}),
        )
        for e in events
    ]
    # Single add_all + commit — one round trip for the whole batch, not per-row
    db.add_all(rows)
    db.commit()

    return {"accepted": len(rows)}
