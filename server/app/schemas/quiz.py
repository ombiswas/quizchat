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


class ClientQuestionResponse(BaseModel):
    """
    Sanitized question representation served to the client during a quiz.
    CRITICAL: Does NOT contain correct_option to prevent client-side inspection.
    """

    id: str
    text: str
    options: list[ClientOptionResponse]
    question_index: int = Field(description="0-based index of this question in the quiz")
    total_questions: int = Field(description="Total number of questions in this quiz session")

    @classmethod
    def from_model(
        cls,
        question: Question,
        question_index: int,
        total_questions: int,
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
