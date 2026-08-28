"""
Exams router.
"""

from fastapi import APIRouter, Depends, Path
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import get_database
from app.repositories.chapter_repository import ChapterRepository
from app.repositories.exam_repository import ExamRepository
from app.repositories.subject_repository import SubjectRepository
from app.schemas.curriculum import ExamResponse, SubjectResponse
from app.services.exam_service import CurriculumService

router = APIRouter(prefix="/exams", tags=["Exams"])


def get_curriculum_service(
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> CurriculumService:
    exam_repo = ExamRepository(db)
    subject_repo = SubjectRepository(db)
    chapter_repo = ChapterRepository(db)
    return CurriculumService(exam_repo, subject_repo, chapter_repo)


@router.get(
    "",
    response_model=list[ExamResponse],
    summary="List all exams",
    description="Returns all available exams (e.g. JEE Main, NEET UG, UPSC CSE).",
)
async def list_exams(
    service: CurriculumService = Depends(get_curriculum_service),
) -> list[ExamResponse]:
    return await service.list_exams()


@router.get(
    "/{exam_id}/subjects",
    response_model=list[SubjectResponse],
    summary="List subjects for an exam",
    description="Returns all subjects belonging to the specified exam.",
)
async def list_subjects_for_exam(
    exam_id: str = Path(description="24-character hexadecimal MongoDB ObjectId of the exam"),
    service: CurriculumService = Depends(get_curriculum_service),
) -> list[SubjectResponse]:
    return await service.list_subjects_for_exam(exam_id)
