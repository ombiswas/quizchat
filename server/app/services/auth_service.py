"""
Authentication business logic service.
"""

from fastapi import HTTPException, status
from app.core.security import create_access_token
from app.repositories.user_repository import UserRepository
from app.schemas.auth import TokenResponse
from app.schemas.user import UserResponse


class AuthService:
    """
    Service managing user authentication and session token issuance.
    """

    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def login(self, user_id: str) -> TokenResponse:
        """
        Authenticate user by ID (dummy passwordless flow), verify user exists,
        and issue a signed JWT session token.
        """
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with id '{user_id}' does not exist.",
            )

        token = create_access_token(user_id=str(user.id))
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse.from_model(user),
        )
