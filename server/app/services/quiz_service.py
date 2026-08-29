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
from app.models.question_attempt import QuestionAttempt
from app.models.quiz import Quiz
from app.repositories.chapter_repository import ChapterRepository
from app.repositories.exam_repository import ExamRepository
from app.repositories.question_attempt_repository import QuestionAttemptRepository
from app.repositories.question_repository import QuestionRepository
from app.repositories.quiz_repository import QuizRepository
from app.repositories.subject_repository import SubjectRepository
from app.schemas.quiz import (
    ClientQuestionResponse,
    QuizResultResponse,
    QuizStartResponse,
    SubmitAnswerResponse,
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
        attempt_repo: QuestionAttemptRepository,
        exam_repo: ExamRepository,
        subject_repo: SubjectRepository,
    ):
        self.quiz_repo = quiz_repo
        self.question_repo = question_repo
        self.chapter_repo = chapter_repo
        self.attempt_repo = attempt_repo
        self.exam_repo = exam_repo
        self.subject_repo = subject_repo

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

    async def submit_answer(
        self,
        user_id: str | ObjectId,
        quiz_id: str,
        question_id: str,
        selected_option: str,
    ) -> SubmitAnswerResponse:
        """
        Process an answer submission for the current question in a quiz.

        Enforcement & Analytics Event Stamping:
        --------------------------------------
        1. Stale / Out-of-order Rejection:
           Verifies that `question_id` matches `quiz.question_ids[quiz.current_index]`.
           Any attempt to submit for a previously answered question or a skipped index
           is rejected with 409 Conflict. This guarantees sequential progression.
        2. Correctness & Duration:
           Compares `selected_option` against the question's `correct_option`.
           Calculates `response_duration_ms = answer_submitted_at (now) - question_shown_at`.
        3. Event Log (techstack.md §3.2):
           Inserts an immutable `QuestionAttempt` record containing all 11 fields.
        4. Progress Advance:
           Increments `quiz.current_index` and `quiz.score` (if correct).
           Marks status "completed" and sets `completed_at` if all questions are done.
        5. Response:
           Returns `{ is_correct, correct_option, next_question }`.
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
                detail="You are not authorized to submit answers for this quiz.",
            )

        # 3. Status check
        if quiz.status != "in_progress" or quiz.current_index >= len(quiz.question_ids):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Quiz has already been completed.",
            )

        # 4. Strict Index / Question ID match ("no going back" enforcement)
        expected_question_id_str = str(quiz.question_ids[quiz.current_index])
        if str(question_id) != expected_question_id_str:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Out-of-order submission: expected question '{expected_question_id_str}' "
                    f"at index {quiz.current_index}, but received '{question_id}'."
                ),
            )

        # 5. Fetch question model to evaluate correct_option
        question = await self.question_repo.get_by_id(expected_question_id_str)
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Question with id '{expected_question_id_str}' not found.",
            )

        # 6. Evaluate correctness
        normalized_selected = selected_option.strip().upper()
        normalized_correct = question.correct_option.strip().upper()
        is_correct = normalized_selected == normalized_correct

        # 7. Compute timing
        now = datetime.now(timezone.utc)
        shown_at = quiz.current_question_shown_at or quiz.started_at or now
        if shown_at.tzinfo is None:
            shown_at = shown_at.replace(tzinfo=timezone.utc)
        # Ensure non-negative duration in case of clock drift
        response_duration_ms = max(0, int((now - shown_at).total_seconds() * 1000))

        # 8. Record immutable QuestionAttempt event with all 11 fields (techstack.md §3.2)
        attempt = QuestionAttempt(
            user_id=quiz.user_id,
            quiz_id=quiz.id,
            question_id=question.id,
            exam_id=quiz.exam_id,
            subject_id=quiz.subject_id,
            chapter_id=quiz.chapter_id,
            question_index_in_quiz=quiz.current_index,
            question_shown_at=shown_at,
            answer_submitted_at=now,
            response_duration_ms=response_duration_ms,
            selected_option=normalized_selected,
            is_correct=is_correct,
        )
        await self.attempt_repo.create(attempt)

        # 9. Advance quiz progress
        new_index = quiz.current_index + 1
        new_score = quiz.score + (1 if is_correct else 0)
        is_completed = new_index >= len(quiz.question_ids)
        new_status = "completed" if is_completed else "in_progress"
        completed_at = now if is_completed else None
        next_shown_at = now if not is_completed else None

        await self.quiz_repo.update_progress(
            quiz_id=quiz.id,
            current_index=new_index,
            score=new_score,
            status=new_status,
            completed_at=completed_at,
            current_question_shown_at=next_shown_at,
        )

        # 10. Fetch next question if quiz remains in_progress
        next_client_q: ClientQuestionResponse | None = None
        if not is_completed:
            next_question_id = quiz.question_ids[new_index]
            next_q_model = await self.question_repo.get_by_id(next_question_id)
            if next_q_model:
                next_client_q = ClientQuestionResponse.from_model(
                    question=next_q_model,
                    question_index=new_index,
                    total_questions=len(quiz.question_ids),
                )

        return SubmitAnswerResponse(
            is_correct=is_correct,
            correct_option=question.correct_option,
            next_question=next_client_q,
        )

    async def get_quiz_result(
        self,
        user_id: str | ObjectId,
        quiz_id: str,
    ) -> QuizResultResponse:
        """
        Fetch the final score summary and curriculum metadata for a completed quiz.

        Guards:
          - 404 if the quiz does not exist.
          - 403 if the quiz belongs to another user.
          - 409 if the quiz is still in progress (not completed).
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
                detail="You are not authorized to view results for this quiz.",
            )

        # 3. Completion check
        if quiz.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Quiz is still in progress and has not been completed yet.",
            )

        # 4. Fetch curriculum names for display breadcrumb
        exam = await self.exam_repo.get_by_id(quiz.exam_id)
        subject = await self.subject_repo.get_by_id(quiz.subject_id)
        chapter = await self.chapter_repo.get_by_id(quiz.chapter_id)

        exam_name = exam.name if exam else "Unknown Exam"
        subject_name = subject.name if subject else "Unknown Subject"
        chapter_name = chapter.name if chapter else "Unknown Chapter"

        # 5. Compute metrics
        total_questions = len(quiz.question_ids)
        accuracy_pct = (
            round((quiz.score / total_questions) * 100, 2)
            if total_questions > 0
            else 0.0
        )
        total_time_taken_ms = 0
        if quiz.completed_at and quiz.started_at:
            comp_at = quiz.completed_at if quiz.completed_at.tzinfo else quiz.completed_at.replace(tzinfo=timezone.utc)
            start_at = quiz.started_at if quiz.started_at.tzinfo else quiz.started_at.replace(tzinfo=timezone.utc)
            total_time_taken_ms = max(
                0, int((comp_at - start_at).total_seconds() * 1000)
            )

        completed_iso = (
            quiz.completed_at.isoformat()
            if quiz.completed_at
            else datetime.now(timezone.utc).isoformat()
        )

        return QuizResultResponse(
            quiz_id=str(quiz.id),
            score=quiz.score,
            total_questions=total_questions,
            accuracy_pct=accuracy_pct,
            total_time_taken_ms=total_time_taken_ms,
            exam_id=str(quiz.exam_id),
            exam_name=exam_name,
            subject_id=str(quiz.subject_id),
            subject_name=subject_name,
            chapter_id=str(quiz.chapter_id),
            chapter_name=chapter_name,
            completed_at=completed_iso,
        )
