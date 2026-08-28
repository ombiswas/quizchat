"""
FastAPI routers package.

Each module in this package maps to one logical resource (users, auth, quizzes,
analytics, …). Routers are intentionally thin: they parse the incoming request,
call the appropriate service method, and return the response model.  They must
never import Motor or touch the database directly.
"""

from app.api.users import router as users_router
from app.api.auth import router as auth_router
from app.api.exams import router as exams_router
from app.api.subjects import router as subjects_router

__all__ = [
    "users_router",
    "auth_router",
    "exams_router",
    "subjects_router",
]
