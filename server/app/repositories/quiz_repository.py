"""
Quiz repository for MongoDB operations on the `quizzes` collection.
"""

from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.quiz import Quiz


class QuizRepository:
    """
    Data-access layer for the `quizzes` collection.
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["quizzes"]

    async def create(self, quiz: Quiz) -> Quiz:
        """
        Insert a new quiz document into the `quizzes` collection.
        """
        doc = quiz.to_mongo()
        result = await self.collection.insert_one(doc)
        quiz.id = result.inserted_id
        return quiz

    async def get_by_id(self, quiz_id: str | ObjectId) -> Quiz | None:
        """
        Fetch a quiz document by its ObjectId or 24-character hex string.
        """
        if isinstance(quiz_id, str):
            if not ObjectId.is_valid(quiz_id):
                return None
            oid = ObjectId(quiz_id)
        else:
            oid = quiz_id

        doc = await self.collection.find_one({"_id": oid})
        if not doc:
            return None
        return Quiz.model_validate(doc)

    async def update_shown_time(
        self,
        quiz_id: str | ObjectId,
        shown_at: datetime,
    ) -> None:
        """
        Update the timestamp when the current question was served to the client.
        """
        if isinstance(quiz_id, str):
            oid = ObjectId(quiz_id)
        else:
            oid = quiz_id

        await self.collection.update_one(
            {"_id": oid},
            {"$set": {"current_question_shown_at": shown_at}},
        )

    async def update_progress(
        self,
        quiz_id: str | ObjectId,
        current_index: int,
        score: int,
        status: str,
        completed_at: datetime | None = None,
        current_question_shown_at: datetime | None = None,
    ) -> None:
        """
        Update a quiz's progress state after an answer submission.
        """
        if isinstance(quiz_id, str):
            oid = ObjectId(quiz_id)
        else:
            oid = quiz_id

        update_fields: dict = {
            "current_index": current_index,
            "score": score,
            "status": status,
            "current_question_shown_at": current_question_shown_at,
        }
        if completed_at is not None:
            update_fields["completed_at"] = completed_at

        await self.collection.update_one(
            {"_id": oid},
            {"$set": update_fields},
        )

    async def mark_abandoned(
        self,
        quiz_id: str | ObjectId,
        completed_at: datetime,
    ) -> bool:
        """
        Mark an in-progress quiz session as abandoned.
        """
        if isinstance(quiz_id, str):
            oid = ObjectId(quiz_id)
        else:
            oid = quiz_id

        res = await self.collection.update_one(
            {"_id": oid, "status": "in_progress"},
            {"$set": {"status": "abandoned", "completed_at": completed_at}},
        )
        return res.modified_count > 0

