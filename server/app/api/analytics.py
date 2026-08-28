"""
Analytics router.
"""

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import get_database
from app.repositories.analytics_repository import AnalyticsRepository
from app.schemas.analytics import (
    LearningVelocityItem,
    FatigueBucketItem,
    QuestionDifficultyItem,
)
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


@router.get(
    "/fatigue",
    response_model=list[FatigueBucketItem],
    summary="Get Fatigue Analysis across question sequence positions",
    description=(
        "Computes drop-off in accuracy and response speed across question position buckets "
        "(1-5, 6-10, 11-15, ...). Supports per-quiz, per-user aggregate, or systemic aggregate modes."
    ),
)
async def get_fatigue_analysis(
    user_id: str | None = Query(default=None, description="User ID for aggregate per-user fatigue"),
    quiz_id: str | None = Query(default=None, description="Quiz ID for single-attempt fatigue"),
    exam_id: str | None = Query(default=None, description="Optional filter by exam ID"),
    subject_id: str | None = Query(default=None, description="Optional filter by subject ID"),
    chapter_id: str | None = Query(default=None, description="Optional filter by chapter ID"),
    service: AnalyticsService = Depends(get_analytics_service),
) -> list[FatigueBucketItem]:
    return await service.get_fatigue_analysis(
        user_id=user_id,
        quiz_id=quiz_id,
        exam_id=exam_id,
        subject_id=subject_id,
        chapter_id=chapter_id,
    )


@router.get(
    "/question-difficulty",
    response_model=list[QuestionDifficultyItem],
    summary="Get Question Difficulty Index leaderboard",
    description=(
        "Computes the Question Difficulty Index across questions via aggregation "
        "combining normalized accuracy (inverted) and response duration. Ranked hardest first."
    ),
)
async def get_question_difficulty(
    exam_id: str | None = Query(default=None, description="Optional filter by exam ID"),
    subject_id: str | None = Query(default=None, description="Optional filter by subject ID"),
    chapter_id: str | None = Query(default=None, description="Optional filter by chapter ID"),
    service: AnalyticsService = Depends(get_analytics_service),
) -> list[QuestionDifficultyItem]:
    return await service.get_question_difficulty(
        exam_id=exam_id,
        subject_id=subject_id,
        chapter_id=chapter_id,
    )
