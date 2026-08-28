"""
MongoDB index initialization.

Ensures that all collections have the performance and query indexes defined in
techstack.md §3.3 created at application startup.
"""

import logging
from typing import Mapping, Sequence
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, IndexModel

logger = logging.getLogger(__name__)

# Index specifications matching techstack.md §3.3
INDEX_SPECS: Mapping[str, Sequence[IndexModel]] = {
    # ── question_attempts (event-tracking collection for analytics) ───────────
    "question_attempts": [
        # Learning Velocity Index (per-user rollup)
        IndexModel([("user_id", ASCENDING)], name="idx_question_attempts_user_id"),
        # Question Difficulty Index (group by question)
        IndexModel([("question_id", ASCENDING)], name="idx_question_attempts_question_id"),
        # Fatigue analysis (bucket by position within a quiz)
        IndexModel(
            [("quiz_id", ASCENDING), ("question_index_in_quiz", ASCENDING)],
            name="idx_question_attempts_quiz_id_q_index",
        ),
        # Per-user-per-quiz fatigue drill-down
        IndexModel(
            [("user_id", ASCENDING), ("quiz_id", ASCENDING)],
            name="idx_question_attempts_user_id_quiz_id",
        ),
    ],
    # ── questions ─────────────────────────────────────────────────────────────
    "questions": [
        # Quiz generation (pull N random questions for a chapter)
        IndexModel([("chapter_id", ASCENDING)], name="idx_questions_chapter_id"),
    ],
    # ── quizzes ───────────────────────────────────────────────────────────────
    "quizzes": [
        # "Resume in-progress quiz" lookups
        IndexModel(
            [("user_id", ASCENDING), ("status", ASCENDING)],
            name="idx_quizzes_user_id_status",
        ),
    ],
    # ── subjects ──────────────────────────────────────────────────────────────
    "subjects": [
        # Navigation queries: list subjects in an exam
        IndexModel([("exam_id", ASCENDING)], name="idx_subjects_exam_id"),
    ],
    # ── chapters ──────────────────────────────────────────────────────────────
    "chapters": [
        # Navigation queries: list chapters in an exam or subject
        IndexModel([("exam_id", ASCENDING)], name="idx_chapters_exam_id"),
        IndexModel([("subject_id", ASCENDING)], name="idx_chapters_subject_id"),
    ],
}


async def create_indexes(db: AsyncIOMotorDatabase) -> None:
    """
    Create all required indexes across collections.

    Called once during FastAPI lifespan startup to ensure index parity without
    requiring manual database setup steps.
    """
    logger.info("Initializing MongoDB indexes...")
    for collection_name, indexes in INDEX_SPECS.items():
        try:
            created = await db[collection_name].create_indexes(list(indexes))
            logger.info("Created/verified indexes for '%s': %s", collection_name, created)
        except Exception as exc:
            logger.error(
                "Failed to create indexes for collection '%s': %s",
                collection_name,
                exc,
                exc_info=True,
            )
            raise
    logger.info("All MongoDB indexes initialized successfully.")
