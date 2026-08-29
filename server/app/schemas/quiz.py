"""
Quiz API schemas.
"""

from pydantic import BaseModel, Field
from app.models.question import Question


class ClientOptionResponse(BaseModel):
    """
    Option representation served to the frontend.
    """

    key: str = Field(description="Option key identifier (e.g. 'A', 'B', 'C', 'D')")
    text: str = Field(description="Option display text")


class PastAttemptItem(BaseModel):
    """
    Sanitized past attempt representation to restore chat history on refresh.
    """

    question_id: str
    question_index: int
    question_text: str
    selected_option: str
    selected_option_text: str
    is_correct: bool
    correct_option: str


class ClientQuestionResponse(BaseModel):
    """
    Sanitized question representation served to the client during a quiz.
    CRITICAL: Does NOT contain correct_option for active question to prevent client-side inspection.
    """

    id: str
    text: str
    options: list[ClientOptionResponse]
    question_index: int = Field(description="0-based index of this question in the quiz")
    total_questions: int = Field(description="Total number of questions in this quiz session")
    previous_attempts: list[PastAttemptItem] = Field(default_factory=list)

    @classmethod
    def from_model(
        cls,
        question: Question,
        question_index: int,
        total_questions: int,
        previous_attempts: list[PastAttemptItem] | None = None,
    ) -> "ClientQuestionResponse":
        return cls(
            id=str(question.id),
            text=question.text,
            options=[
                ClientOptionResponse(key=opt.key, text=opt.text)
                for opt in question.options
            ],
            question_index=question_index,
            total_questions=total_questions,
            previous_attempts=previous_attempts or [],
        )


class CreateQuizRequest(BaseModel):
    """
    Request payload to start a new quiz session.
    """

    chapter_id: str = Field(
        description="24-character hexadecimal MongoDB ObjectId of the selected chapter"
    )


class QuizStartResponse(BaseModel):
    """
    Response returned upon successful creation of a quiz.
    """

    quiz_id: str
    status: str = "in_progress"
    current_index: int = 0
    total_questions: int
    question: ClientQuestionResponse


class SubmitAnswerRequest(BaseModel):
    """
    Request payload when submitting an answer to a question.
    """

    question_id: str = Field(
        description="24-character hexadecimal MongoDB ObjectId of the question being answered"
    )
    selected_option: str = Field(
        description="Option key selected by the user (e.g. 'A', 'B', 'C', 'D')"
    )


class SubmitAnswerResponse(BaseModel):
    """
    Response returned after submitting an answer.
    """

    is_correct: bool = Field(description="Whether the selected option matched correct_option")
    correct_option: str = Field(description="The correct option key for feedback display")
    next_question: ClientQuestionResponse | None = Field(
        default=None,
        description="The next question in the thread, or null if the quiz is complete",
    )


class QuestionAttemptDetail(BaseModel):
    """
    Detailed attempt item in the completed quiz result breakdown.
    """

    question_id: str
    question_index: int
    question_text: str
    selected_option: str
    selected_option_text: str
    correct_option: str
    correct_option_text: str
    is_correct: bool
    response_duration_ms: int


class QuizResultResponse(BaseModel):
    """
    Final summary result for a completed quiz with optional question-by-question breakdown.
    """

    quiz_id: str
    score: int = Field(description="Total number of correctly answered questions")
    total_questions: int = Field(description="Total questions in the quiz")
    accuracy_pct: float = Field(description="Percentage of correct answers (0-100)")
    total_time_taken_ms: int = Field(description="Total elapsed time in milliseconds")
    exam_id: str
    exam_name: str
    subject_id: str
    subject_name: str
    chapter_id: str
    chapter_name: str
    status: str = "completed"
    completed_at: str = Field(description="ISO formatted completion timestamp")
    attempts: list[QuestionAttemptDetail] = Field(
        default_factory=list,
        description="Full question-by-question review of user attempts and correct answers",
    )


class QuizAbandonResponse(BaseModel):
    """
    Response returned when a quiz session is abandoned early.
    """

    quiz_id: str
    status: str = "abandoned"
    score: int
    total_questions: int
    answered_questions: int
    completed_at: str

