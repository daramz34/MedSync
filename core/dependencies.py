from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from core.security import verify_access_token
from models import User
from collections.abc import Callable
from typing import Any
from models import User
from enums import UserRole
oauth_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth_scheme), db:Session=Depends(get_db))-> User:
    payload = verify_access_token(token)
    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid token subject")
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid authentication credentials")


    return user


def require_role(*allowed_roles: str) -> Callable[..., Any]:
    allowed = {r.value if hasattr(r, "value") else str(r) for r in allowed_roles}

    def dependency(current_user: User = Depends(get_current_user)) -> User:
        current = (
            current_user.role.value
            if hasattr(current_user.role, "value")
            else str(current_user.role)
        )
        if current not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Insufficient permissions")
        return current_user

    return dependency


def require_doctor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.DOCTOR.value:
        raise HTTPException(403, "Doctor access required")
    return current_user



