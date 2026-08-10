from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Enrollment, Product, User
from app.schemas import EnrollmentCreate, EnrollmentOut

router = APIRouter(prefix="/api/enrollments", tags=["enrollments"])


@router.get("/me", response_model=list[EnrollmentOut])
def my_enrollments(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user.id)
        .order_by(Enrollment.created_at.desc())
        .all()
    )


@router.post("", response_model=EnrollmentOut, status_code=status.HTTP_201_CREATED)
def enroll(
    data: EnrollmentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    product = db.get(Product, data.product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Course not found")

    # Idempotent: enrolling twice returns the existing enrollment rather than erroring,
    # so a double-click or a stale page can't 500.
    existing = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user.id, Enrollment.product_id == product.id)
        .first()
    )
    if existing:
        return existing

    enrollment = Enrollment(user_id=user.id, product_id=product.id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment
