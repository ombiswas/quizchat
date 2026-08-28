"""
Security and authentication utilities.

Provides JWT generation, token verification, and the `get_current_user` FastAPI
dependency for protecting endpoints.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Mapping
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.db import get_database
from app.models.user import User
from app.repositories.user_repository import UserRepository

# HTTPBearer extracts the token from the standard `Authorization: Bearer <token>` header
http_bearer_scheme = HTTPBearer(
    auto_error=True,
    description="Attach token as `Bearer <JWT>` in Authorization header",
)


def create_access_token(
    user_id: str,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Generate a signed JWT token containing the user's ObjectId string in `sub`.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.jwt_expire_minutes)

    payload: dict[str, Any] = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    encoded_jwt = jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a signed JWT token.
    Raises JWTError if invalid or expired.
    """
    payload = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
    )
    return payload


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> User:
    """
    FastAPI dependency that extracts and validates the JWT from Authorization header,
    looks up the user in MongoDB, and returns the User model.

    Usage in routers:
        @router.post("/submit")
        async def submit(
            current_user: User = Depends(get_current_user),
            ...
        ):
            ...
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
