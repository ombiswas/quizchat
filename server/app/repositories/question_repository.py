"""
Question repository for MongoDB operations on the `questions` collection.
"""

from typing import Sequence
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.question import Question


class QuestionRepository:
    """
    Data-access layer for the `questions` collection.
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["questions"]

    async def get_by_id(self, question_id: str | ObjectId) -> Question | None:
        """
        Fetch a question by its ObjectId or 24-character hex string.
        """
        if isinstance(question_id, str):
            if not ObjectId.is_valid(question_id):
                return None
            oid = ObjectId(question_id)
        else:
            oid = question_id

        doc = await self.collection.find_one({"_id": oid})
        if not doc:
            return None
        return Question.model_validate(doc)

    async def sample_by_chapter(
        self,
        chapter_id: str | ObjectId,
        limit: int = 15,
    ) -> list[Question]:
        """
        Sample N questions at random for a given chapter using MongoDB's $sample stage.

        This utilizes the `{ chapter_id: 1 }` index in the $match stage followed
        by $sample for true server-side uniform random sampling.
        """
        if isinstance(chapter_id, str):
            if not ObjectId.is_valid(chapter_id):
                return []
            oid = ObjectId(chapter_id)
        else:
            oid = chapter_id

        pipeline = [
            {"$match": {"chapter_id": oid}},
            {"$sample": {"size": limit}},
        ]
        cursor = self.collection.aggregate(pipeline)
        docs = await cursor.to_list(length=limit)
        return [Question.model_validate(doc) for doc in docs]

    async def get_by_ids(
        self,
        question_ids: Sequence[str | ObjectId],
    ) -> list[Question]:
        """
        Fetch multiple questions by their IDs.
        """
        valid_oids = [
            ObjectId(qid) if isinstance(qid, str) and ObjectId.is_valid(qid) else qid
            for qid in question_ids
            if isinstance(qid, ObjectId) or (isinstance(qid, str) and ObjectId.is_valid(qid))
        ]
        if not valid_oids:
            return []

        cursor = self.collection.find({"_id": {"$in": valid_oids}})
        docs = await cursor.to_list(length=len(valid_oids))
        return [Question.model_validate(doc) for doc in docs]
