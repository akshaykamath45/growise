import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Event, User
from app.schemas import EventBatchIn

router = APIRouter(prefix="/api/events", tags=["events"])

MAX_EVENTS_PER_BATCH = 100


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
