"""
Quiz business logic service.

Handles quiz lifecycle:
  - Starting new quiz sessions by sampling N random questions from a chapter ($sample)
  - Recording the question_shown_at timestamp upon delivery
  - Serving sanitized questions without exposing correct_option
"""

from datetime import datetime, timezone
from typing import Any
from bson import ObjectId
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.quiz import Quiz
from app.repositories.chapter_repository import ChapterRepository
from app.repositories.question_repository import QuestionRepository
from app.repositories.quiz_repository import QuizRepository
from app.schemas.quiz import (
    ClientQuestionResponse,
    QuizStartResponse,
)


class QuizService:
    """
    Service managing quiz session creation, progression, and timing.
    """

    def __init__(
        self,
        quiz_repo: QuizRepository,
        question_repo: QuestionRepository,
        chapter_repo: ChapterRepository,
    ):
        self.quiz_repo = quiz_repo
        self.question_repo = question_repo
        self.chapter_repo = chapter_repo

    async def create_quiz(
        self,
        user_id: str | ObjectId,
        chapter_id: str,
        num_questions: int | None = None,
    ) -> QuizStartResponse:
        """
        Create a new quiz session for the user on a selected chapter.

        Implementation & Timing Assumption:
          - Validates that the requested chapter exists.
          - Samples N questions (default 15 from settings.seed_questions_per_quiz)
            at random using MongoDB's `$sample` aggregation stage.
          - Creates a `quizzes` document with `status="in_progress"` and `current_index=0`.
          - Stamps `current_question_shown_at` at quiz creation time because the first
            question (index 0) is delivered immediately in this HTTP response. This accurately
            reflects the moment the client first receives and displays the question.
          - Returns the quiz ID and the first question with `correct_option` stripped.
        """
        # 1. Validate chapter
        chapter = await self.chapter_repo.get_by_id(chapter_id)
        if not chapter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Chapter with id '{chapter_id}' not found.",
            )

        # 2. Sample N questions via MongoDB aggregation $sample
        limit = num_questions or settings.seed_questions_per_quiz
        questions = await self.question_repo.sample_by_chapter(chapter_id, limit=limit)
        if not questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No questions found for chapter '{chapter.name}'.",
            )

        now = datetime.now(timezone.utc)
        user_oid = ObjectId(user_id) if isinstance(user_id, str) else user_id

        # 3. Create quiz session record
        quiz = Quiz(
            user_id=user_oid,
            exam_id=chapter.exam_id,
            subject_id=chapter.subject_id,
            chapter_id=chapter.id,
            question_ids=[q.id for q in questions],
            status="in_progress",
            current_index=0,
            score=0,
            started_at=now,
            current_question_shown_at=now,
        )
        saved_quiz = await self.quiz_repo.create(quiz)

        # 4. Prepare sanitized question representation for client (without correct_option)
        client_first_question = ClientQuestionResponse.from_model(
            question=questions[0],
            question_index=0,
            total_questions=len(questions),
        )

        return QuizStartResponse(
            quiz_id=str(saved_quiz.id),
            status=saved_quiz.status,
            current_index=saved_quiz.current_index,
            total_questions=len(questions),
            question=client_first_question,
        )

    async def get_current_question(
        self,
        user_id: str | ObjectId,
        quiz_id: str,
    ) -> ClientQuestionResponse:
        """
        Fetch the current (and only servable) question for an active quiz session.

        Server-Side Integrity & "Cannot Revisit" Enforcement:
        ----------------------------------------------------
        1. Authentication & Ownership: We verify that `quiz.user_id` matches the calling user.
           Other users receive 403 Forbidden.
        2. Session Status: If the quiz is marked "completed", we reject with 409 Conflict.
           Users cannot replay a finished quiz thread.
        3. Index Enforcement: The API strictly serves `quiz.question_ids[quiz.current_index]`.
           Clients cannot pass arbitrary question IDs or request past indices. The pointer
           `current_index` is strictly managed and advanced on the server during submit.
        4. Display Timing: If `current_question_shown_at` is uninitialized (e.g. after advancing
           to the next index or upon first retrieval), we stamp the current server time `now`.
           This guarantees that the response duration measured on submit is computed accurately
           from when the question was genuinely made available to the client.
        5. Secret Protection: The returned ClientQuestionResponse omits `correct_option`.
        """
        # 1. Validate quiz exists
        quiz = await self.quiz_repo.get_by_id(quiz_id)
        if not quiz:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quiz with id '{quiz_id}' not found.",
            )

        # 2. Ownership check
        req_user_id_str = str(user_id)
        quiz_user_id_str = str(quiz.user_id)
        if req_user_id_str != quiz_user_id_str:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to access this quiz.",
            )

        # 3. Status check
        if quiz.status != "in_progress" or quiz.current_index >= len(quiz.question_ids):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Quiz has already been completed.",
            )

        # 4. Fetch the current question by the server-controlled current_index
        current_question_id = quiz.question_ids[quiz.current_index]
        question = await self.question_repo.get_by_id(current_question_id)
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Question with id '{current_question_id}' not found.",
            )

        # 5. Stamp / refresh question_shown_at if not already stamped
        if quiz.current_question_shown_at is None:
            now = datetime.now(timezone.utc)
            await self.quiz_repo.update_shown_time(quiz.id, now)

        return ClientQuestionResponse.from_model(
            question=question,
            question_index=quiz.current_index,
            total_questions=len(quiz.question_ids),
        )
