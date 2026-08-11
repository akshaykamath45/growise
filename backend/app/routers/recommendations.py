import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.agent.pipeline import run_agent
from app.agent.trigger import get_active_recommendation, should_regenerate
from app.auth import get_current_user
from app.database import get_db
from app.models import Recommendation, User
from app.schemas import RecommendationItemOut, RecommendationOut

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


def _to_out(rec: Recommendation) -> RecommendationOut:
    return RecommendationOut(
        id=rec.id,
        narrative=rec.narrative,
        trigger_reason=rec.trigger_reason,
        evidence=json.loads(rec.evidence) if rec.evidence else [],
        created_at=rec.created_at,
        items=[
            RecommendationItemOut(product=item.product, rank=item.rank, reason=item.reason)
            for item in rec.items
        ],
    )


@router.get("/me", response_model=RecommendationOut | None)
def get_my_recommendation(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    should, reason = should_regenerate(db, user)
    if should:
        rec = run_agent(db, user, trigger_reason=reason)
        if rec is None:
            # Do not make a failed agent run look like a learner with no
            # behavioral signal. The client needs an actionable error state.
            raise HTTPException(status_code=502, detail="The recommendation agent could not generate a result. Please try again.")
    else:
        rec = get_active_recommendation(db, user)
    return _to_out(rec) if rec else None


@router.post("/refresh", response_model=RecommendationOut)
def refresh_recommendation(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    should, reason = should_regenerate(db, user)
    if reason == "no_signal":
        raise HTTPException(status_code=400, detail="Not enough activity yet — browse a few courses first.")
    rec = run_agent(db, user, trigger_reason="manual_refresh")
    if rec is None:
        raise HTTPException(status_code=502, detail="Couldn't generate a recommendation right now. Try again.")
    return _to_out(rec)
