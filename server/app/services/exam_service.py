"""
Curriculum service orchestrating business logic for Exams, Subjects, and Chapters.
"""

from fastapi import HTTPException, status

from app.repositories.chapter_repository import ChapterRepository
from app.repositories.exam_repository import ExamRepository
from app.repositories.subject_repository import SubjectRepository
from app.schemas.curriculum import (
    ChapterResponse,
    ExamResponse,
    SubjectResponse,
)


class CurriculumService:
    """
    Service for browsing the hierarchical exam -> subject -> chapter curriculum.
    """

    def __init__(
        self,
        exam_repo: ExamRepository,
        subject_repo: SubjectRepository,
        chapter_repo: ChapterRepository,
    ):
        self.exam_repo = exam_repo
        self.subject_repo = subject_repo
        self.chapter_repo = chapter_repo

    async def list_exams(self) -> list[ExamResponse]:
        """
        List all available exams.
        """
        exams = await self.exam_repo.get_all()
        return [ExamResponse.from_model(e) for e in exams]

    async def list_subjects_for_exam(self, exam_id: str) -> list[SubjectResponse]:
        """
        List all subjects for a given exam. Raises 404 if the exam does not exist.
        """
        exam = await self.exam_repo.get_by_id(exam_id)
        if not exam:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exam with id '{exam_id}' not found.",
            )

        subjects = await self.subject_repo.get_by_exam_id(exam_id)
        return [SubjectResponse.from_model(s) for s in subjects]

    async def list_chapters_for_subject(self, subject_id: str) -> list[ChapterResponse]:
        """
        List all chapters for a given subject. Raises 404 if the subject does not exist.
        """
        subject = await self.subject_repo.get_by_id(subject_id)
        if not subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subject with id '{subject_id}' not found.",
            )

        chapters = await self.chapter_repo.get_by_subject_id(subject_id)
        return [ChapterResponse.from_model(c) for c in chapters]
