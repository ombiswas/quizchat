"""
Analytics Pydantic response schemas.
"""

from pydantic import BaseModel, Field


class LearningVelocityItem(BaseModel):
    """
    Learning Velocity Index (LVI) per-user metrics item.
    Matches techstack.md §4.1 output specification.
    """

    user_id: str = Field(description="User unique identifier (ObjectId string)")
    user_name: str = Field(description="User display name from users collection")
    accuracy: float = Field(
        description="Raw accuracy ratio (correct attempts / total attempts, 0.0 - 1.0)"
    )
    avg_response_time_ms: float = Field(
        description="Mean response duration in milliseconds across all attempts"
    )
    consistency_score: float = Field(
        description="Scale-independent consistency score: 1 / (1 + CV_response_time)"
    )
    learning_velocity_index: float = Field(
        description="Weighted composite score: 0.5*norm_acc + 0.3*(1-norm_time) + 0.2*norm_consistency"
    )


class FatigueBucketItem(BaseModel):
    """
    Fatigue analysis metrics per question bucket.
    Matches techstack.md §4.2 output specification.
    """

    range: str = Field(
        description="1-based question position range within the quiz (e.g. '1-5', '6-10', '11-15')"
    )
    accuracy: float = Field(
        description="Average accuracy ratio in this question bucket (0.0 - 1.0)"
    )
    avg_response_time_ms: float = Field(
        description="Mean response duration in milliseconds across questions in this bucket"
    )


class QuestionDifficultyItem(BaseModel):
    """
    Question Difficulty Index item.
    Matches techstack.md §4.3 output specification.
    """

    question_id: str = Field(description="Question unique identifier (ObjectId string)")
    question_text: str = Field(description="Display text of the question")
    chapter: str = Field(description="Name of the chapter this question belongs to")
    total_attempts: int = Field(description="Total number of attempts across users")
    accuracy_pct: float = Field(
        description="Accuracy ratio / fraction of correct attempts (0.0 - 1.0)"
    )
    avg_response_time_ms: float = Field(
        description="Mean response duration in milliseconds"
    )
    difficulty_score: float = Field(
        description="Weighted difficulty score: 0.6*(1-norm_acc) + 0.4*norm_time"
    )
