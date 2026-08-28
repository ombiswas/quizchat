"""
Quizzes router.
"""

from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import get_database
from app.core.security import get_current_user
from app.models.user import User
from app.repositories.chapter_repository import ChapterRepository
from app.repositories.question_repository import QuestionRepository
from app.repositories.quiz_repository import QuizRepository
from app.schemas.quiz import (
    ClientQuestionResponse,
    CreateQuizRequest,
    QuizStartResponse,
)
from app.services.quiz_service import QuizService

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


def get_quiz_service(
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> QuizService:
    quiz_repo = QuizRepository(db)
    question_repo = QuestionRepository(db)
    chapter_repo = ChapterRepository(db)
    return QuizService(quiz_repo, question_repo, chapter_repo)


@router.post(
    "",
    response_model=QuizStartResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start a new quiz session",
    description="Generates a new quiz by sampling random questions for the chapter and returns the first question.",
)
async def create_quiz(
    request: CreateQuizRequest,
    current_user: User = Depends(get_current_user),
    service: QuizService = Depends(get_quiz_service),
) -> QuizStartResponse:
    return await service.create_quiz(
        user_id=current_user.id,
        chapter_id=request.chapter_id,
    )


@router.get(
    "/{quiz_id}/current-question",
    response_model=ClientQuestionResponse,
    summary="Get current active question in quiz",
    description=(
        "Returns the question corresponding to current_index in the active quiz session. "
        "Guarantees that users cannot revisit earlier questions or skip ahead."
    ),
)
async def get_current_question(
    quiz_id: str,
    current_user: User = Depends(get_current_user),
    service: QuizService = Depends(get_quiz_service),
) -> ClientQuestionResponse:
    return await service.get_current_question(
        user_id=current_user.id,
        quiz_id=quiz_id,
    )
