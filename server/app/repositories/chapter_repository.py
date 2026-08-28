"""
Chapter repository for MongoDB operations on the `chapters` collection.
"""

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.chapter import Chapter


class ChapterRepository:
    """
    Data-access layer for the `chapters` collection.
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["chapters"]

    async def get_by_id(self, chapter_id: str | ObjectId) -> Chapter | None:
        """
        Fetch a chapter by its ObjectId or 24-character hex string.
        """
        if isinstance(chapter_id, str):
            if not ObjectId.is_valid(chapter_id):
                return None
            oid = ObjectId(chapter_id)
        else:
            oid = chapter_id

        doc = await self.collection.find_one({"_id": oid})
        if not doc:
            return None
        return Chapter.model_validate(doc)

    async def get_by_subject_id(self, subject_id: str | ObjectId) -> list[Chapter]:
        """
        Fetch all chapters in a subject, utilizing the `{ subject_id: 1 }` index.
        """
        if isinstance(subject_id, str):
            if not ObjectId.is_valid(subject_id):
                return []
            oid = ObjectId(subject_id)
        else:
            oid = subject_id

        cursor = self.collection.find({"subject_id": oid}).sort("name", 1)
        docs = await cursor.to_list(length=None)
        return [Chapter.model_validate(doc) for doc in docs]

    async def get_by_exam_id(self, exam_id: str | ObjectId) -> list[Chapter]:
        """
        Fetch all chapters in an exam, utilizing the `{ exam_id: 1 }` index.
        """
        if isinstance(exam_id, str):
            if not ObjectId.is_valid(exam_id):
                return []
            oid = ObjectId(exam_id)
        else:
            oid = exam_id

        cursor = self.collection.find({"exam_id": oid}).sort("name", 1)
        docs = await cursor.to_list(length=None)
        return [Chapter.model_validate(doc) for doc in docs]
