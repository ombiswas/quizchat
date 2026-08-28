"""
MongoDB document models package.

These Pydantic models represent the shape of documents as they are stored in
MongoDB.  They are NOT the same as schemas/ (API request/response shapes):
  - models/ = what lives in the database
  - schemas/ = what travels over the HTTP wire

The distinction prevents leaking internal fields (e.g. correct_option) through
the API, and allows the DB shape and API shape to diverge when needed.
"""

from app.models.base import MongoBaseModel, PyObjectId
from app.models.user import User
from app.models.exam import Exam
from app.models.subject import Subject
from app.models.chapter import Chapter
from app.models.question import Option, Question
from app.models.quiz import Quiz
from app.models.question_attempt import QuestionAttempt

__all__ = [
    "MongoBaseModel",
    "PyObjectId",
    "User",
    "Exam",
    "Subject",
    "Chapter",
    "Option",
    "Question",
    "Quiz",
    "QuestionAttempt",
]
