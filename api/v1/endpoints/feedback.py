from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from core.limiter import limiter
from crud import create_feedback
from database import get_db
from models import User
from schemas import FeedbackCreate, FeedbackResponse

router = APIRouter(prefix="/feedback", tags=["FEEDBACK"])


@router.post("/", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def submit_feedback_endpoint(
    request: Request,
    data: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_feedback(db, data, current_user)