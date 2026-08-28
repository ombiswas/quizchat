"""
Curriculum (Exams, Subjects, Chapters) API schemas.
"""

from pydantic import BaseModel, ConfigDict
from app.models.chapter import Chapter
from app.models.exam import Exam
from app.models.subject import Subject


class ExamResponse(BaseModel):
    """
    Public representation of an Exam.
    """

    id: str
    name: str
    description: str

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_model(cls, exam: Exam) -> "ExamResponse":
        return cls(
            id=str(exam.id),
            name=exam.name,
            description=exam.description,
        )


class SubjectResponse(BaseModel):
    """
    Public representation of a Subject with parent exam_id.
    """

    id: str
    exam_id: str
    name: str

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_model(cls, subject: Subject) -> "SubjectResponse":
        return cls(
            id=str(subject.id),
            exam_id=str(subject.exam_id),
            name=subject.name,
        )


class ChapterResponse(BaseModel):
    """
    Public representation of a Chapter with parent exam_id and subject_id.
    """

    id: str
    exam_id: str
    subject_id: str
    name: str

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_model(cls, chapter: Chapter) -> "ChapterResponse":
        return cls(
            id=str(chapter.id),
            exam_id=str(chapter.exam_id),
            subject_id=str(chapter.subject_id),
            name=chapter.name,
        )
