"""
QuestionAttempt document model.
"""

from datetime import datetime
from app.models.base import MongoBaseModel, PyObjectId


class QuestionAttempt(MongoBaseModel):
    """
    MongoDB document model for the `question_attempts` collection.
    Matches techstack.md §3.2 schema.
    """

    user_id: PyObjectId
    quiz_id: PyObjectId
    question_id: PyObjectId
    exam_id: PyObjectId
    subject_id: PyObjectId
    chapter_id: PyObjectId
    question_index_in_quiz: int
    question_shown_at: datetime
    answer_submitted_at: datetime
    response_duration_ms: int
    selected_option: str
    is_correct: bool
