"""
User document model.
"""

from datetime import datetime, timezone
from pydantic import Field
from app.models.base import MongoBaseModel


class User(MongoBaseModel):
    """
    MongoDB document model for the `users` collection.
    Matches techstack.md §3.2 schema.
    """

    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
