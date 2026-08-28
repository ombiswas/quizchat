"""
Exam repository for MongoDB operations on the `exams` collection.
"""

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.exam import Exam


class ExamRepository:
    """
    Data-access layer for the `exams` collection.
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["exams"]

    async def get_all(self) -> list[Exam]:
        """
        Fetch all exams sorted alphabetically by name.
        """
        cursor = self.collection.find().sort("name", 1)
        docs = await cursor.to_list(length=None)
        return [Exam.model_validate(doc) for doc in docs]

    async def get_by_id(self, exam_id: str | ObjectId) -> Exam | None:
        """
        Fetch an exam by its ObjectId or 24-character hex string.
        """
        if isinstance(exam_id, str):
            if not ObjectId.is_valid(exam_id):
                return None
            oid = ObjectId(exam_id)
        else:
            oid = exam_id

        doc = await self.collection.find_one({"_id": oid})
        if not doc:
            return None
        return Exam.model_validate(doc)
