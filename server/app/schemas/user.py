"""
User API schemas.
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.user import User


class UserResponse(BaseModel):
    """
    Public user representation returned by /api/users.
    """

    id: str
    name: str
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_model(cls, user: User) -> "UserResponse":
        """
        Convert internal User model (with ObjectId) to UserResponse (with string id).
        """
        return cls(
            id=str(user.id),
            name=user.name,
            created_at=user.created_at,
        )
