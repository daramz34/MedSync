from passlib.context import CryptContext
from fastapi import HTTPException, status
import jwt
from models import User
from datetime import datetime, timedelta, timezone
from core.config import settings
from typing import Any
import hashlib


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=10)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _role_value(user: User) -> str:
    """Works whether role is a String column or an Enum column."""
    return user.role.value if hasattr(user.role, "value") else str(user.role)
def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()

def create_access_token(user: User)-> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user.id),
                 "email": user.email,
                 "role": _role_value(user),
                 "full_name": user.full_name,
                 "type":"access",
                 "iat": now,
                 "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verify_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
    except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
    except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid token type")
    if not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Invalid token subject")

    return payload