"""
Business logic services package.

Services orchestrate the application's business rules: quiz session lifecycle,
scoring, access-control checks, etc.  They sit between routers and repositories:
routers call services; services call repositories.  Services must never build
Motor queries or aggregation pipelines directly — that belongs in repositories/.
"""

from app.services.user_service import UserService
from app.services.auth_service import AuthService
from app.services.exam_service import CurriculumService
from app.services.quiz_service import QuizService

__all__ = [
    "UserService",
    "AuthService",
    "CurriculumService",
    "QuizService",
]
