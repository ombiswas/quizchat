"""
Exam document model.
"""

from app.models.base import MongoBaseModel


class Exam(MongoBaseModel):
    """
    MongoDB document model for the `exams` collection.
    Matches techstack.md §3.2 schema.
    """

    name: str
    description: str
