"""
Analytics business logic service.

Orchestrates analytical queries and metric reporting.
"""

from typing import Any
from bson import ObjectId
from app.repositories.analytics_repository import AnalyticsRepository
from app.schemas.analytics import LearningVelocityItem


class AnalyticsService:
    """
    Service layer providing high-level analytics operations.
    """

    def __init__(self, analytics_repo: AnalyticsRepository):
        self.analytics_repo = analytics_repo

    async def get_learning_velocity(
        self,
        exam_id: str | None = None,
        subject_id: str | None = None,
        chapter_id: str | None = None,
    ) -> list[LearningVelocityItem]:
        """
        Retrieve the ranked Learning Velocity Index (LVI) leaderboard.
        """
        return await self.analytics_repo.get_learning_velocity_index(
            exam_id=exam_id,
            subject_id=subject_id,
            chapter_id=chapter_id,
        )
