"""
Analytics router.
"""

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import get_database
from app.repositories.analytics_repository import AnalyticsRepository
from app.schemas.analytics import LearningVelocityItem
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


def get_analytics_service(
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> AnalyticsService:
    analytics_repo = AnalyticsRepository(db)
    return AnalyticsService(analytics_repo)


@router.get(
    "/learning-velocity",
    response_model=list[LearningVelocityItem],
    summary="Get Learning Velocity Index leaderboard",
    description=(
        "Computes the Learning Velocity Index across all learners via an aggregation "
        "pipeline combining normalized accuracy, response speed, and scale-independent consistency."
    ),
)
async def get_learning_velocity(
    exam_id: str | None = Query(default=None, description="Optional filter by exam ID"),
    subject_id: str | None = Query(default=None, description="Optional filter by subject ID"),
    chapter_id: str | None = Query(default=None, description="Optional filter by chapter ID"),
    service: AnalyticsService = Depends(get_analytics_service),
) -> list[LearningVelocityItem]:
    return await service.get_learning_velocity(
        exam_id=exam_id,
        subject_id=subject_id,
        chapter_id=chapter_id,
    )
