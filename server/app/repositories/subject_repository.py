"""
Subject repository for MongoDB operations on the `subjects` collection.
"""

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.subject import Subject


class SubjectRepository:
    """
    Data-access layer for the `subjects` collection.
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["subjects"]

    async def get_by_id(self, subject_id: str | ObjectId) -> Subject | None:
        """
        Fetch a subject by its ObjectId or 24-character hex string.
        """
        if isinstance(subject_id, str):
            if not ObjectId.is_valid(subject_id):
                return None
            oid = ObjectId(subject_id)
        else:
            oid = subject_id

        doc = await self.collection.find_one({"_id": oid})
        if not doc:
            return None
        return Subject.model_validate(doc)

    async def get_by_exam_id(self, exam_id: str | ObjectId) -> list[Subject]:
        """
        Fetch all subjects belonging to an exam, utilizing the `{ exam_id: 1 }` index.
        """
        if isinstance(exam_id, str):
            if not ObjectId.is_valid(exam_id):
                return []
            oid = ObjectId(exam_id)
        else:
            oid = exam_id

        cursor = self.collection.find({"exam_id": oid}).sort("name", 1)
        docs = await cursor.to_list(length=None)
        return [Subject.model_validate(doc) for doc in docs]
