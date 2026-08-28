"""
MongoDB repositories package.

All Motor queries and aggregation pipelines live here, isolated from business
logic.  This isolation matters for two reasons:
  1. Testability: repositories can be mocked/stubbed without touching FastAPI or
     service-layer logic.
  2. Maintainability: when a query needs a new index or the pipeline shape changes,
     the change is contained in one place.

Repositories receive and return typed Python objects (Pydantic models or plain
dataclasses), never raw MongoDB dicts.  Callers should not need to know whether
the data came from a simple find() or a ten-stage aggregation.
"""

from app.repositories.user_repository import UserRepository
from app.repositories.exam_repository import ExamRepository
from app.repositories.subject_repository import SubjectRepository
from app.repositories.chapter_repository import ChapterRepository

__all__ = [
    "UserRepository",
    "ExamRepository",
    "SubjectRepository",
    "ChapterRepository",
]
