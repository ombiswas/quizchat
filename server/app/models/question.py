"""
Question and embedded Option document models.
"""

from datetime import datetime, timezone
from pydantic import BaseModel, Field
from app.models.base import MongoBaseModel, PyObjectId


class Option(BaseModel):
    """
    Embedded option within a Question.
    Matches techstack.md §3.2 schema.
    """

    key: str
    text: str


class Question(MongoBaseModel):
    """
    MongoDB document model for the `questions` collection.
    Matches techstack.md §3.2 schema.
    """

    exam_id: PyObjectId
    subject_id: PyObjectId
    chapter_id: PyObjectId
    text: str
    options: list[Option]
    correct_option: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
