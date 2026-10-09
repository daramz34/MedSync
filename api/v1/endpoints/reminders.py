"""Medication reminder endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from core.limiter import limiter
from database import get_db
from models import Medication, User
from services.email import send_medication_reminder_email

router = APIRouter(prefix="/reminders", tags=["REMINDERS"])


class TestReminderRequest(BaseModel):
    medication_id: int


@router.post("/test-reminder")
@limiter.limit("5/minute")
def send_test_reminder_endpoint(
    request: Request,
    payload: TestReminderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a real reminder email right now, so delivery can be verified.

    Deliberately ignores reminder_enabled and reminder_time — this is a test,
    and the point is to prove the email path works at all.
    """
    medication = (
        db.query(Medication)
        .filter(
            Medication.id == payload.medication_id,
            Medication.patient_id == current_user.id,
        )
        .first()
    )
    if medication is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication not found",
        )

    # Synchronous on purpose: the caller needs to know whether it really sent.
    # A BackgroundTask would return before we knew the result.
    sent = send_medication_reminder_email(current_user, medication)

    if not sent:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Could not send the email. Check SMTP_USERNAME / SMTP_PASSWORD "
                "and make sure SMTP_PASSWORD is a Gmail App Password."
            ),
        )

    return {"sent": True, "to": current_user.email, "medication": medication.drug_name}
