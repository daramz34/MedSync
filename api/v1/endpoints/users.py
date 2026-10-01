from database import get_db
from schemas import DoctorList, PublicUserResponse
from crud import get_all_doctors, get_user_by_id
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from core.cache import get_cached_model
from core.limiter import limiter

router = APIRouter(prefix="/users", tags=["USERS"])


# static /doctors BEFORE /{user_id}
@router.get("/doctors", response_model=DoctorList)
@limiter.limit("30/minute")
def list_public_doctors(
    request: Request,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return get_cached_model(
        f"doctors_list:{page}:{limit}",
        600,                                   # 10 min
        DoctorList,
        lambda: get_all_doctors(db, page, limit),
    )


@router.get("/{user_id}", response_model=PublicUserResponse)
@limiter.limit("30/minute")
def get_public_profile(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db),
):
    user = get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
