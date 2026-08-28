"""
User business logic service.
"""

from fastapi import HTTPException, status
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserResponse


class UserService:
    """
    Service orchestrating user-related operations.
    """

    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def list_users(self) -> list[UserResponse]:
        """
        List all available users for login selection.
        """
        users = await self.user_repo.get_all()
        return [UserResponse.from_model(u) for u in users]

    async def get_user(self, user_id: str) -> UserResponse:
        """
        Get a specific user by ID.
        """
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with id '{user_id}' not found.",
            )
        return UserResponse.from_model(user)
