"""
Subjects router.
"""

from fastapi import APIRouter, Depends, Path
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.db import get_database
from app.repositories.chapter_repository import ChapterRepository
from app.repositories.exam_repository import ExamRepository
from app.repositories.subject_repository import SubjectRepository
from app.schemas.curriculum import ChapterResponse
from app.services.exam_service import CurriculumService

router = APIRouter(prefix="/subjects", tags=["Subjects"])


def get_curriculum_service(
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> CurriculumService:
    exam_repo = ExamRepository(db)
    subject_repo = SubjectRepository(db)
    chapter_repo = ChapterRepository(db)
    return CurriculumService(exam_repo, subject_repo, chapter_repo)


@router.get(
    "/{subject_id}/chapters",
    response_model=list[ChapterResponse],
    summary="List chapters for a subject",
    description="Returns all chapters belonging to the specified subject.",
)
async def list_chapters_for_subject(
    subject_id: str = Path(description="24-character hexadecimal MongoDB ObjectId of the subject"),
    service: CurriculumService = Depends(get_curriculum_service),
) -> list[ChapterResponse]:
    return await service.list_chapters_for_subject(subject_id)
