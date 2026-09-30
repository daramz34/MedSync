from database import get_db
from schemas import LogCreate, LogResponse
from crud import create_log, get_today_logs, get_medication_logs
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from core.dependencies import get_current_user
from core.limiter import limiter
from models import User

router = APIRouter(prefix="/logs", tags=["LOGS"])


@router.post("/", response_model=LogResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def create_log_endpoint(request: Request,data: LogCreate, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    log = create_log(db, data, current_user)
    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication not found",
        )
    return log


@router.get("/today", response_model=list[LogResponse])
@limiter.limit("30/minute")
def get_today_logs_endpoint( request: Request, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    return get_today_logs(db, current_user)



@router.get("/{medication_id}", response_model=list[LogResponse])
@limiter.limit("30/minute")
def get_medication_logs_endpoint(request: Request,medication_id: int, db: Session = Depends(get_db),current_user: User = Depends(get_current_user)):
    logs = get_medication_logs(db, medication_id, current_user)
    if logs is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication not found",
        )
    return logs
