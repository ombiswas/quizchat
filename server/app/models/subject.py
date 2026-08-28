"""
Subject document model.
"""

from app.models.base import MongoBaseModel, PyObjectId


class Subject(MongoBaseModel):
    """
    MongoDB document model for the `subjects` collection.
    Matches techstack.md §3.2 schema.
    """

    exam_id: PyObjectId
    name: str
