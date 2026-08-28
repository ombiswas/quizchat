"""
Authentication router.
"""

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import get_database
from app.core.security import get_current_user
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


def get_auth_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> AuthService:
    repo = UserRepository(db)
    return AuthService(repo)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with dummy user selection",
    description="Validates user existence and returns a signed JWT session token.",
)
async def login(
    request: LoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    return await service.login(request.user_id)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile",
    description="Validates the provided Bearer token and returns the current user.",
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return UserResponse.from_model(current_user)
