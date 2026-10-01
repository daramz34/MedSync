from database import get_db
from crud import get_medication_by_id
from fastapi import APIRouter, Depends, HTTPException, Request, status
from schemas import StreakResponse
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from core.limiter import limiter
from models import Streak, User

router = APIRouter(prefix="/streaks", tags=["STREAKS"])


# ── STREAK STATS ──
@router.get("/{medication_id}", response_model=StreakResponse)
@limiter.limit("30/minute")
def get_medication_streak_endpoint(request: Request,medication_id: int,db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    
    medication = get_medication_by_id(db, medication_id, current_user)
    if medication is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication not found",
        )

    streak = (db.query(Streak).filter(
            Streak.medication_id == medication.id,
            Streak.patient_id == medication.patient_id,
        )
        .first()
    )
    if streak is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Streak not found",
        )

    return streak

