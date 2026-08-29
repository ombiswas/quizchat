"""
FastAPI application factory.

This module creates and configures the FastAPI application instance.
It is the single entry point for uvicorn: `uvicorn app.main:app`.

Responsibilities:
  - Define the application lifespan (startup/shutdown hooks) to manage
    the Motor connection pool correctly.
  - Mount CORS middleware so the React frontend can reach the API.
  - Register all API routers (added incrementally as each phase is built).
  - Expose the /health endpoint used by Docker's healthcheck and reviewers.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.db import get_motor_client
from app.core.indexes import create_indexes


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Manage the Motor connection pool and database initialization across the
    application's lifetime.

    Why here, not at module import time?
    Creating the client at module import time makes testing harder (the client
    tries to connect immediately) and ties the pool's lifetime to the Python
    process rather than the ASGI app.  Using FastAPI's lifespan means the
    connection is opened exactly once when the app starts accepting requests
    and closed cleanly when it stops — even during hot-reload cycles.
    """
    # ── Startup ───────────────────────────────────────────────────────────────
    motor_client = get_motor_client()
    app.state.motor_client = motor_client
    app.state.db = motor_client[settings.mongo_db_name]

    # Create MongoDB indexes on application startup (techstack.md §3.3)
    await create_indexes(app.state.db)

    yield  # Application runs here

    # ── Shutdown ──────────────────────────────────────────────────────────────
    motor_client.close()


# ── App factory ───────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    """
    Build and configure the FastAPI application.

    Keeping app creation in a factory function (rather than a bare module-level
    `app = FastAPI(...)`) makes it easy to create isolated app instances in
    tests without importing global state.
    """
    application = FastAPI(
        title="QuizChat API",
        description=(
            "Backend for the WhatsApp-style quiz application. "
            "Interactive docs available at /docs."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Allow the configured frontend origin to call the API from a browser.
    # In production, replace allow_origins with the exact deployed frontend URL.
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────────────────────
    # Routers are registered here as each phase is built.
    from app.api.users import router as users_router
    from app.api.auth import router as auth_router
    from app.api.exams import router as exams_router
    from app.api.subjects import router as subjects_router
    from app.api.quizzes import router as quizzes_router
    from app.api.analytics import router as analytics_router

    application.include_router(users_router, prefix="/api")
    application.include_router(auth_router, prefix="/api")
    application.include_router(exams_router, prefix="/api")
    application.include_router(subjects_router, prefix="/api")
    application.include_router(quizzes_router, prefix="/api")
    application.include_router(analytics_router, prefix="/api")

    return application


# Module-level app instance — this is what uvicorn imports.
app = create_app()


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    """
    Liveness probe.

    Returns 200 as long as the Python process is alive and the ASGI app is
    responding.  Docker's healthcheck and the reviewer's first smoke-test
    both rely on this endpoint.

    Note: this does NOT check MongoDB connectivity — that would make it a
    readiness probe (a different concept).  A separate /health/ready endpoint
    can be added later if needed.
    """
    return {"status": "ok"}
