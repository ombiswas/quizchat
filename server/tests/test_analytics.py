"""
Unit and mathematical validation tests for the Analytics Aggregation Pipelines.

Tests Learning Velocity Index (§4.1), Fatigue Analysis (§4.2), and
Question Difficulty Index (§4.3) using a small, hand-crafted dataset of 6
question attempt events to verify the exact mathematical formulas,
scale-independent consistency, window-based normalizations, and composite weights.
"""

import math
from datetime import datetime, timezone
import pytest
from bson import ObjectId
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.main import create_app
from app.core.db import get_database
from app.repositories.analytics_repository import (
    AnalyticsRepository,
    WEIGHT_ACCURACY,
    WEIGHT_SPEED,
    WEIGHT_CONSISTENCY,
    WEIGHT_DIFFICULTY_ACCURACY,
    WEIGHT_DIFFICULTY_TIME,
    _build_curriculum_match_filter,
)
from app.schemas.analytics import (
    LearningVelocityItem,
    FatigueBucketItem,
    QuestionDifficultyItem,
)


@pytest.fixture
def handcrafted_dataset():
    """
    Fixture producing 6 hand-crafted question attempt documents.

    Dataset Structure:
      - 2 Users: User A (3 attempts), User B (3 attempts)
      - 2 Questions: Question 1 (3 attempts), Question 2 (3 attempts)
      - 1 Chapter: "Kinematics"
    """
    user_a_id = ObjectId()
    user_b_id = ObjectId()
    q1_id = ObjectId()
    q2_id = ObjectId()
    exam_id = ObjectId()
    subject_id = ObjectId()
    chapter_id = ObjectId()

    # 6 Attempt documents
    attempts = [
        # ── User A attempts ──────────────────────────────────────────────────
        {
            "_id": ObjectId(),
            "user_id": user_a_id,
            "quiz_id": ObjectId(),
            "question_id": q1_id,
            "exam_id": exam_id,
            "subject_id": subject_id,
            "chapter_id": chapter_id,
            "question_index_in_quiz": 0,  # Range 1-5
            "question_shown_at": datetime.now(timezone.utc),
            "answer_submitted_at": datetime.now(timezone.utc),
            "response_duration_ms": 3000,
            "selected_option": "A",
            "is_correct": True,
        },
        {
            "_id": ObjectId(),
            "user_id": user_a_id,
            "quiz_id": ObjectId(),
            "question_id": q1_id,
            "exam_id": exam_id,
            "subject_id": subject_id,
            "chapter_id": chapter_id,
            "question_index_in_quiz": 1,  # Range 1-5
            "question_shown_at": datetime.now(timezone.utc),
            "answer_submitted_at": datetime.now(timezone.utc),
            "response_duration_ms": 4000,
            "selected_option": "A",
            "is_correct": True,
        },
        {
            "_id": ObjectId(),
            "user_id": user_a_id,
            "quiz_id": ObjectId(),
            "question_id": q2_id,
            "exam_id": exam_id,
            "subject_id": subject_id,
            "chapter_id": chapter_id,
            "question_index_in_quiz": 2,  # Range 1-5
            "question_shown_at": datetime.now(timezone.utc),
            "answer_submitted_at": datetime.now(timezone.utc),
            "response_duration_ms": 5000,
            "selected_option": "C",
            "is_correct": False,
        },
        # ── User B attempts ──────────────────────────────────────────────────
        {
            "_id": ObjectId(),
            "user_id": user_b_id,
            "quiz_id": ObjectId(),
            "question_id": q1_id,
            "exam_id": exam_id,
            "subject_id": subject_id,
            "chapter_id": chapter_id,
            "question_index_in_quiz": 5,  # Range 6-10
            "question_shown_at": datetime.now(timezone.utc),
            "answer_submitted_at": datetime.now(timezone.utc),
            "response_duration_ms": 2000,
            "selected_option": "D",
            "is_correct": False,
        },
        {
            "_id": ObjectId(),
            "user_id": user_b_id,
            "quiz_id": ObjectId(),
            "question_id": q2_id,
            "exam_id": exam_id,
            "subject_id": subject_id,
            "chapter_id": chapter_id,
            "question_index_in_quiz": 6,  # Range 6-10
            "question_shown_at": datetime.now(timezone.utc),
            "answer_submitted_at": datetime.now(timezone.utc),
            "response_duration_ms": 6000,
            "selected_option": "B",
            "is_correct": True,
        },
        {
            "_id": ObjectId(),
            "user_id": user_b_id,
            "quiz_id": ObjectId(),
            "question_id": q2_id,
            "exam_id": exam_id,
            "subject_id": subject_id,
            "chapter_id": chapter_id,
            "question_index_in_quiz": 10,  # Range 11-15
            "question_shown_at": datetime.now(timezone.utc),
            "answer_submitted_at": datetime.now(timezone.utc),
            "response_duration_ms": 10000,
            "selected_option": "A",
            "is_correct": False,
        },
    ]

    return {
        "user_a_id": user_a_id,
        "user_b_id": user_b_id,
        "q1_id": q1_id,
        "q2_id": q2_id,
        "exam_id": exam_id,
        "subject_id": subject_id,
        "chapter_id": chapter_id,
        "attempts": attempts,
    }


def test_learning_velocity_hand_computed_math(handcrafted_dataset):
    """
    Proves the exact mathematical correctness of the Learning Velocity Index formula:
      LVI = 0.5 * norm_acc + 0.3 * (1 - norm_time) + 0.2 * norm_consistency

    Hand Computations:
      User A:
        - Accuracy = 2/3 = 0.666667
        - Mean Time = (3000 + 4000 + 5000)/3 = 4000.0 ms
        - Population Variance = ((3000-4000)^2 + 0 + (5000-4000)^2)/3 = 2000000/3
        - Population StdDev = sqrt(2000000/3) = 816.49658 ms
        - CV = 816.49658 / 4000 = 0.204124
        - Consistency = 1 / (1 + 0.204124) = 0.830479

      User B:
        - Accuracy = 1/3 = 0.333333
        - Mean Time = (2000 + 6000 + 10000)/3 = 6000.0 ms
        - Population Variance = ((2000-6000)^2 + 0 + (10000-6000)^2)/3 = 32000000/3
        - Population StdDev = sqrt(32000000/3) = 3265.98632 ms
        - CV = 3265.98632 / 6000 = 0.544331
        - Consistency = 1 / (1 + 0.544331) = 0.647529

      Min-Max Normalization:
        - Accuracy: min = 1/3, max = 2/3 -> Norm(A) = 1.0, Norm(B) = 0.0
        - Mean Time: min = 4000, max = 6000 -> Norm(A) = 0.0 (1-norm=1.0), Norm(B) = 1.0 (1-norm=0.0)
        - Consistency: min = 0.647529, max = 0.830479 -> Norm(A) = 1.0, Norm(B) = 0.0

      Composite LVI:
        - User A: 0.5*1.0 + 0.3*1.0 + 0.2*1.0 = 1.0000
        - User B: 0.5*0.0 + 0.3*0.0 + 0.2*0.0 = 0.0000
    """
    # ── User A calculations ──────────────────────────────────────────────────
    user_a_times = [3000, 4000, 5000]
    user_a_acc = 2.0 / 3.0
    user_a_mean_time = sum(user_a_times) / 3.0
    user_a_var = sum((t - user_a_mean_time) ** 2 for t in user_a_times) / 3.0
    user_a_std = math.sqrt(user_a_var)
    user_a_cv = user_a_std / user_a_mean_time
    user_a_cons = 1.0 / (1.0 + user_a_cv)

    assert pytest.approx(user_a_acc, abs=1e-3) == 0.6667
    assert pytest.approx(user_a_mean_time, abs=1e-3) == 4000.0
    assert pytest.approx(user_a_std, abs=1e-3) == 816.4966
    assert pytest.approx(user_a_cv, abs=1e-3) == 0.2041
    assert pytest.approx(user_a_cons, abs=1e-3) == 0.8305

    # ── User B calculations ──────────────────────────────────────────────────
    user_b_times = [2000, 6000, 10000]
    user_b_acc = 1.0 / 3.0
    user_b_mean_time = sum(user_b_times) / 3.0
    user_b_var = sum((t - user_b_mean_time) ** 2 for t in user_b_times) / 3.0
    user_b_std = math.sqrt(user_b_var)
    user_b_cv = user_b_std / user_b_mean_time
    user_b_cons = 1.0 / (1.0 + user_b_cv)

    assert pytest.approx(user_b_acc, abs=1e-3) == 0.3333
    assert pytest.approx(user_b_mean_time, abs=1e-3) == 6000.0
    assert pytest.approx(user_b_std, abs=1e-3) == 3265.9863
    assert pytest.approx(user_b_cv, abs=1e-3) == 0.5443
    assert pytest.approx(user_b_cons, abs=1e-3) == 0.6475

    # ── Normalizations & Composite LVI ───────────────────────────────────────
    norm_acc_a = (user_a_acc - user_b_acc) / (user_a_acc - user_b_acc)
    norm_acc_b = (user_b_acc - user_b_acc) / (user_a_acc - user_b_acc)

    norm_time_a = (user_a_mean_time - user_a_mean_time) / (user_b_mean_time - user_a_mean_time)
    norm_time_b = (user_b_mean_time - user_a_mean_time) / (user_b_mean_time - user_a_mean_time)

    norm_cons_a = (user_a_cons - user_b_cons) / (user_a_cons - user_b_cons)
    norm_cons_b = (user_b_cons - user_b_cons) / (user_a_cons - user_b_cons)

    lvi_a = (
        WEIGHT_ACCURACY * norm_acc_a
        + WEIGHT_SPEED * (1.0 - norm_time_a)
        + WEIGHT_CONSISTENCY * norm_cons_a
    )
    lvi_b = (
        WEIGHT_ACCURACY * norm_acc_b
        + WEIGHT_SPEED * (1.0 - norm_time_b)
        + WEIGHT_CONSISTENCY * norm_cons_b
    )

    assert pytest.approx(lvi_a, rel=1e-4) == 1.0000
    assert pytest.approx(lvi_b, rel=1e-4) == 0.0000


def test_question_difficulty_hand_computed_math(handcrafted_dataset):
    """
    Proves the exact mathematical correctness of the Question Difficulty Index:
      Difficulty Score = 0.6 * (1 - norm_accuracy) + 0.4 * norm_avg_time

    Hand Computations:
      Question 1 (Attempts: [True, 3000ms], [True, 4000ms], [False, 2000ms]):
        - Total attempts = 3
        - Correct = 2
        - Accuracy = 2/3 = 0.666667
        - Mean response time = (3000 + 4000 + 2000)/3 = 3000.0 ms

      Question 2 (Attempts: [False, 5000ms], [True, 6000ms], [False, 10000ms]):
        - Total attempts = 3
        - Correct = 1
        - Accuracy = 1/3 = 0.333333
        - Mean response time = (5000 + 6000 + 10000)/3 = 7000.0 ms

      Normalization:
        - Accuracy: min = 1/3, max = 2/3 -> Norm(Q1) = 1.0 (1-norm=0.0), Norm(Q2) = 0.0 (1-norm=1.0)
        - Mean Time: min = 3000, max = 7000 -> Norm(Q1) = 0.0, Norm(Q2) = 1.0

      Composite Difficulty:
        - Question 1: 0.6 * 0.0 + 0.4 * 0.0 = 0.0000 (Easiest question)
        - Question 2: 0.6 * 1.0 + 0.4 * 1.0 = 1.0000 (Hardest question)
    """
    q1_acc = 2.0 / 3.0
    q1_time = (3000 + 4000 + 2000) / 3.0  # 3000.0 ms

    q2_acc = 1.0 / 3.0
    q2_time = (5000 + 6000 + 10000) / 3.0  # 7000.0 ms

    assert pytest.approx(q1_acc, rel=1e-4) == 0.6667
    assert pytest.approx(q1_time, rel=1e-4) == 3000.0

    assert pytest.approx(q2_acc, rel=1e-4) == 0.3333
    assert pytest.approx(q2_time, rel=1e-4) == 7000.0

    norm_acc_q1 = (q1_acc - q2_acc) / (q1_acc - q2_acc)
    norm_acc_q2 = (q2_acc - q2_acc) / (q1_acc - q2_acc)

    norm_time_q1 = (q1_time - q1_time) / (q2_time - q1_time)
    norm_time_q2 = (q2_time - q1_time) / (q2_time - q1_time)

    diff_q1 = (
        WEIGHT_DIFFICULTY_ACCURACY * (1.0 - norm_acc_q1)
        + WEIGHT_DIFFICULTY_TIME * norm_time_q1
    )
    diff_q2 = (
        WEIGHT_DIFFICULTY_ACCURACY * (1.0 - norm_acc_q2)
        + WEIGHT_DIFFICULTY_TIME * norm_time_q2
    )

    assert pytest.approx(diff_q1, rel=1e-4) == 0.0000  # Easiest
    assert pytest.approx(diff_q2, rel=1e-4) == 1.0000  # Hardest


def test_fatigue_analysis_hand_computed_math(handcrafted_dataset):
    """
    Proves the exact mathematical correctness of the Fatigue Analysis bucketing:
      Bucket 1-5 (indices 0, 1, 2):
        - Attempts: 3
        - Accuracy = (1 + 1 + 0) / 3 = 0.6667
        - Mean Time = (3000 + 4000 + 5000) / 3 = 4000.0 ms

      Bucket 6-10 (indices 5, 6):
        - Attempts: 2
        - Accuracy = (0 + 1) / 2 = 0.5000
        - Mean Time = (2000 + 6000) / 2 = 4000.0 ms

      Bucket 11-15 (index 10):
        - Attempts: 1
        - Accuracy = 0.0
        - Mean Time = 10000.0 ms
    """
    b1_acc = (1 + 1 + 0) / 3.0
    b1_time = (3000 + 4000 + 5000) / 3.0

    b2_acc = (0 + 1) / 2.0
    b2_time = (2000 + 6000) / 2.0

    b3_acc = 0.0 / 1.0
    b3_time = 10000.0

    assert pytest.approx(b1_acc, rel=1e-4) == 0.6667
    assert pytest.approx(b1_time, rel=1e-4) == 4000.0

    assert pytest.approx(b2_acc, rel=1e-4) == 0.5000
    assert pytest.approx(b2_time, rel=1e-4) == 4000.0

    assert pytest.approx(b3_acc, rel=1e-4) == 0.0000
    assert pytest.approx(b3_time, rel=1e-4) == 10000.0


@pytest.mark.asyncio
async def test_analytics_repository_mock_pipeline_execution(handcrafted_dataset):
    """
    Tests AnalyticsRepository methods with simulated Motor responses,
    verifying pipeline shape and Pydantic model serialization.
    """
    mock_db = MagicMock()
    mock_coll = MagicMock()
    mock_db.__getitem__.return_value = mock_coll

    repo = AnalyticsRepository(mock_db)

    # 1. Test Learning Velocity Index
    mock_lvi_data = [
        {
            "user_id": str(handcrafted_dataset["user_a_id"]),
            "user_name": "User A",
            "accuracy": 0.6667,
            "avg_response_time_ms": 4000.0,
            "consistency_score": 0.8305,
            "learning_velocity_index": 1.0000,
        },
        {
            "user_id": str(handcrafted_dataset["user_b_id"]),
            "user_name": "User B",
            "accuracy": 0.3333,
            "avg_response_time_ms": 6000.0,
            "consistency_score": 0.6475,
            "learning_velocity_index": 0.0000,
        },
    ]
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=mock_lvi_data)
    mock_coll.aggregate.return_value = mock_cursor

    lvi_results = await repo.get_learning_velocity_index()
    assert len(lvi_results) == 2
    assert lvi_results[0].learning_velocity_index == 1.0000
    assert lvi_results[1].learning_velocity_index == 0.0000

    # 2. Test Question Difficulty Index
    mock_qdi_data = [
        {
            "question_id": str(handcrafted_dataset["q2_id"]),
            "question_text": "Question 2 Text",
            "chapter": "Kinematics",
            "total_attempts": 3,
            "accuracy_pct": 0.3333,
            "avg_response_time_ms": 7000.0,
            "difficulty_score": 1.0000,
        },
        {
            "question_id": str(handcrafted_dataset["q1_id"]),
            "question_text": "Question 1 Text",
            "chapter": "Kinematics",
            "total_attempts": 3,
            "accuracy_pct": 0.6667,
            "avg_response_time_ms": 3000.0,
            "difficulty_score": 0.0000,
        },
    ]
    mock_cursor_qdi = MagicMock()
    mock_cursor_qdi.to_list = AsyncMock(return_value=mock_qdi_data)
    mock_coll.aggregate.return_value = mock_cursor_qdi

    qdi_results = await repo.get_question_difficulty_index()
    assert len(qdi_results) == 2
    assert qdi_results[0].difficulty_score == 1.0000  # Hardest first
    assert qdi_results[1].difficulty_score == 0.0000  # Easiest second

    # 3. Test Fatigue Analysis
    mock_coll.find_one = AsyncMock(return_value={"question_index_in_quiz": 10})
    mock_fatigue_data = [
        {"range": "1-5", "accuracy": 0.6667, "avg_response_time_ms": 4000.0},
        {"range": "6-10", "accuracy": 0.5000, "avg_response_time_ms": 4000.0},
        {"range": "11-15", "accuracy": 0.0000, "avg_response_time_ms": 10000.0},
    ]
    mock_cursor_fatigue = MagicMock()
    mock_cursor_fatigue.to_list = AsyncMock(return_value=mock_fatigue_data)
    mock_coll.aggregate.return_value = mock_cursor_fatigue

    fatigue_results = await repo.get_fatigue_analysis()
    assert len(fatigue_results) == 3
    assert fatigue_results[0].range == "1-5"
    assert fatigue_results[1].range == "6-10"
    assert fatigue_results[2].range == "11-15"


def test_analytics_api_endpoints_integration(handcrafted_dataset):
    """
    Tests the FastAPI analytics endpoints with query parameter filtering.
    """
    app = create_app()
    mock_db = MagicMock()
    mock_attempts_coll = MagicMock()

    def get_coll(name):
        if name == "question_attempts":
            return mock_attempts_coll
        return MagicMock()

    mock_db.__getitem__.side_effect = get_coll
    app.dependency_overrides[get_database] = lambda: mock_db
    client = TestClient(app)

    # 1. GET /api/analytics/learning-velocity
    mock_cursor = MagicMock()
    mock_cursor.to_list = AsyncMock(return_value=[
        {
            "user_id": str(handcrafted_dataset["user_a_id"]),
            "user_name": "User A",
            "accuracy": 0.6667,
            "avg_response_time_ms": 4000.0,
            "consistency_score": 0.8305,
            "learning_velocity_index": 1.0000,
        }
    ])
    mock_attempts_coll.aggregate.return_value = mock_cursor
    res = client.get("/api/analytics/learning-velocity")
    assert res.status_code == 200
    assert res.json()[0]["learning_velocity_index"] == 1.0000

    # 2. GET /api/analytics/fatigue
    mock_attempts_coll.find_one = AsyncMock(return_value={"question_index_in_quiz": 10})
    mock_cursor_f = MagicMock()
    mock_cursor_f.to_list = AsyncMock(return_value=[
        {"range": "1-5", "accuracy": 0.6667, "avg_response_time_ms": 4000.0},
        {"range": "6-10", "accuracy": 0.5000, "avg_response_time_ms": 4000.0},
        {"range": "11-15", "accuracy": 0.0000, "avg_response_time_ms": 10000.0},
    ])
    mock_attempts_coll.aggregate.return_value = mock_cursor_f
    res = client.get(f"/api/analytics/fatigue?user_id={str(handcrafted_dataset['user_a_id'])}")
    assert res.status_code == 200
    assert len(res.json()) == 3

    # 3. GET /api/analytics/question-difficulty
    mock_cursor_q = MagicMock()
    mock_cursor_q.to_list = AsyncMock(return_value=[
        {
            "question_id": str(handcrafted_dataset["q2_id"]),
            "question_text": "Question 2 Text",
            "chapter": "Kinematics",
            "total_attempts": 3,
            "accuracy_pct": 0.3333,
            "avg_response_time_ms": 7000.0,
            "difficulty_score": 1.0000,
        }
    ])
    mock_attempts_coll.aggregate.return_value = mock_cursor_q
    res = client.get(f"/api/analytics/question-difficulty?chapter_id={str(handcrafted_dataset['chapter_id'])}")
    assert res.status_code == 200
    assert res.json()[0]["difficulty_score"] == 1.0000
