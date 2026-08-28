"""
User repository for MongoDB operations on the `users` collection.
"""

from typing import Sequence
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.user import User


class UserRepository:
    """
    Data-access layer for the `users` collection.
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["users"]

    async def get_all(self) -> list[User]:
        """
        Fetch all users sorted by name ascending.
        """
        cursor = self.collection.find().sort("name", 1)
        docs = await cursor.to_list(length=None)
        return [User.model_validate(doc) for doc in docs]

    async def get_by_id(self, user_id: str | ObjectId) -> User | None:
        """
        Fetch a user by their ObjectId or 24-character hexadecimal string ID.
        Returns None if not found or if the ID is malformed.
        """
        if isinstance(user_id, str):
            if not ObjectId.is_valid(user_id):
                return None
            oid = ObjectId(user_id)
        else:
            oid = user_id

        doc = await self.collection.find_one({"_id": oid})
        if not doc:
            return None
        return User.model_validate(doc)

    async def create(self, user: User) -> User:
        """
        Insert a new user document.
        """
        doc = user.to_mongo()
        result = await self.collection.insert_one(doc)
        user.id = result.inserted_id
        return user
