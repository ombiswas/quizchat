"""
Users router.
"""

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import get_database
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


def get_user_service(db: AsyncIOMotorDatabase = Depends(get_database)) -> UserService:
    repo = UserRepository(db)
    return UserService(repo)


@router.get(
    "",
    response_model=list[UserResponse],
    summary="List all users",
    description="Returns all users in the system for the login picker screen.",
)
async def list_users(
    service: UserService = Depends(get_user_service),
) -> list[UserResponse]:
    return await service.list_users()
