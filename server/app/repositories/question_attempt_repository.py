"""
QuestionAttempt repository for MongoDB operations on the `question_attempts` collection.
"""

from typing import Sequence
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.question_attempt import QuestionAttempt


class QuestionAttemptRepository:
    """
    Data-access layer for the append-only `question_attempts` event collection.
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["question_attempts"]

    async def create(self, attempt: QuestionAttempt) -> QuestionAttempt:
        """
        Insert a single immutable question attempt event.
        """
        doc = attempt.to_mongo()
        result = await self.collection.insert_one(doc)
        attempt.id = result.inserted_id
        return attempt

    async def get_by_quiz_id(
        self,
        quiz_id: str | ObjectId,
    ) -> list[QuestionAttempt]:
        """
        Fetch all attempt events recorded for a quiz, ordered by question index.
        """
        if isinstance(quiz_id, str):
            if not ObjectId.is_valid(quiz_id):
                return []
            oid = ObjectId(quiz_id)
        else:
            oid = quiz_id

        cursor = self.collection.find({"quiz_id": oid}).sort("question_index_in_quiz", 1)
        docs = await cursor.to_list(length=None)
        return [QuestionAttempt.model_validate(doc) for doc in docs]

    async def get_by_user_id(
        self,
        user_id: str | ObjectId,
    ) -> list[QuestionAttempt]:
        """
        Fetch all attempt events for a given user.
        """
        if isinstance(user_id, str):
            if not ObjectId.is_valid(user_id):
                return []
            oid = ObjectId(user_id)
        else:
            oid = user_id

        cursor = self.collection.find({"user_id": oid}).sort("answer_submitted_at", 1)
        docs = await cursor.to_list(length=None)
        return [QuestionAttempt.model_validate(doc) for doc in docs]
