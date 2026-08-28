"""
Authentication API schemas.
"""

from pydantic import BaseModel, Field
from app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    """
    Request body for POST /api/auth/login.
    """

    user_id: str = Field(
        description="24-character hexadecimal MongoDB ObjectId of the selected user."
    )


class TokenResponse(BaseModel):
    """
    Response returned by POST /api/auth/login containing the JWT and user profile.
    """

    access_token: str
    token_type: str = "bearer"
    user: UserResponse
