"""
Chapter document model.
"""

from app.models.base import MongoBaseModel, PyObjectId


class Chapter(MongoBaseModel):
    """
    MongoDB document model for the `chapters` collection.
    Matches techstack.md §3.2 schema.
    """

    exam_id: PyObjectId
    subject_id: PyObjectId
    name: str
