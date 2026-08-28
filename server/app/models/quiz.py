"""
Quiz document model.
"""

from datetime import datetime, timezone
from pydantic import Field
from app.models.base import MongoBaseModel, PyObjectId


class Quiz(MongoBaseModel):
    """
    MongoDB document model for the `quizzes` collection.
    Matches techstack.md §3.2 schema.
    """

    user_id: PyObjectId
    exam_id: PyObjectId
    subject_id: PyObjectId
    chapter_id: PyObjectId
    question_ids: list[PyObjectId]
    status: str = "in_progress"
    current_index: int = 0
    score: int = 0
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime | None = None
    current_question_shown_at: datetime | None = None
