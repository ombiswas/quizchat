"""
Analytics repository for running MongoDB aggregation pipelines.

Contains the aggregation pipelines for:
  - Learning Velocity Index (§4.1)
  - Fatigue Analysis (§4.2)
  - Question Difficulty Index (§4.3)
"""

from typing import Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.schemas.analytics import (
    LearningVelocityItem,
    FatigueBucketItem,
    QuestionDifficultyItem,
)

# ── Learning Velocity Index (LVI) Constants (techstack.md §4.1) ───────────────
# The composite index balances accuracy, speed (inverted response time),
# and scale-independent consistency.
WEIGHT_ACCURACY: float = 0.5
WEIGHT_SPEED: float = 0.3
WEIGHT_CONSISTENCY: float = 0.2

# ── Question Difficulty Index (QDI) Constants (techstack.md §4.3) ────────────
# Difficulty increases with lower accuracy and higher response duration.
WEIGHT_DIFFICULTY_ACCURACY: float = 0.6
WEIGHT_DIFFICULTY_TIME: float = 0.4


class AnalyticsRepository:
    """
    Data-access layer executing complex analytical aggregation pipelines
    against the `question_attempts` event log collection.
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.attempts_collection = db["question_attempts"]

    async def get_learning_velocity_index(
        self,
        exam_id: str | ObjectId | None = None,
        subject_id: str | ObjectId | None = None,
        chapter_id: str | ObjectId | None = None,
    ) -> list[LearningVelocityItem]:
        """
        Calculates the Learning Velocity Index (LVI) across all users.

        Pipeline Stages (Single Aggregation):
        -------------------------------------
        0. [$match]: Optional filter by exam_id, subject_id, or chapter_id (techstack.md §4.4)
        1. [$group]: Group by user_id -> count total attempts, sum correct, avg response time,
           and population standard deviation of response times ($stdDevPop).
        2. [$project]: Compute raw accuracy (correct/total) and scale-independent consistency:
           consistency = 1 / (1 + CV), where CV = stdDev(time) / mean(time).
        3. [$setWindowFields]: Compute min & max across the entire result set for accuracy,
           avg response time, and consistency for global min-max normalization.
        4. [$project]: Normalize dimensions to [0, 1] and compute composite LVI:
           LVI = 0.5 * norm_accuracy + 0.3 * (1 - norm_avg_time) + 0.2 * norm_consistency.
        5. [$lookup]: Join with `users` collection to retrieve user display names.
        6. [$addFields]: Extract user name and provide fallback if user is missing.
        7. [$project]: Format final schema matching techstack.md §4.1 specification.
        8. [$sort]: Order descending by learning_velocity_index.
        """
        pipeline: list[dict[str, Any]] = []

        # ── Stage 0: Optional Filter Match ────────────────────────────────────
        # Supports scoping analytics down to a specific exam, subject, or chapter.
        match_filters: dict[str, Any] = {}
        if exam_id:
            match_filters["exam_id"] = (
                ObjectId(exam_id) if isinstance(exam_id, str) and ObjectId.is_valid(exam_id) else exam_id
            )
        if subject_id:
            match_filters["subject_id"] = (
                ObjectId(subject_id) if isinstance(subject_id, str) and ObjectId.is_valid(subject_id) else subject_id
            )
        if chapter_id:
            match_filters["chapter_id"] = (
                ObjectId(chapter_id) if isinstance(chapter_id, str) and ObjectId.is_valid(chapter_id) else chapter_id
            )

        if match_filters:
            pipeline.append({"$match": match_filters})

        # ── Stage 1: Group by User ───────────────────────────────────────────
        # Aggregate raw metrics per user:
        # - total_attempts: total questions answered
        # - correct_count: number of correct answers
        # - avg_response_time: mean response duration in ms
        # - std_dev_response_time: population standard deviation of response duration in ms
        pipeline.append({
            "$group": {
                "_id": "$user_id",
                "total_attempts": {"$sum": 1},
                "correct_count": {
                    "$sum": {"$cond": [{"$eq": ["$is_correct", True]}, 1, 0]}
                },
                "avg_response_time": {"$avg": "$response_duration_ms"},
                "std_dev_response_time": {"$stdDevPop": "$response_duration_ms"},
            }
        })

        # ── Stage 2: Compute Intermediate Metrics (Accuracy & Consistency) ─────
        # Accuracy: correct_count / total_attempts
        # Consistency: 1 / (1 + CV), where CV = stdDev / mean.
        # Scale-independent measure ensures fair comparison across fast and slow learners.
        pipeline.append({
            "$project": {
                "user_id": "$_id",
                "total_attempts": 1,
                "correct_count": 1,
                "accuracy": {
                    "$cond": [
                        {"$eq": ["$total_attempts", 0]},
                        0.0,
                        {"$divide": ["$correct_count", "$total_attempts"]},
                    ]
                },
                "avg_response_time": {"$ifNull": ["$avg_response_time", 0.0]},
                "consistency": {
                    "$let": {
                        "vars": {
                            "std": {"$ifNull": ["$std_dev_response_time", 0.0]},
                            "avg": {"$ifNull": ["$avg_response_time", 1.0]},
                        },
                        "in": {
                            "$cond": [
                                {"$lte": ["$$avg", 0]},
                                1.0,
                                {
                                    "$divide": [
                                        1.0,
                                        {
                                            "$add": [
                                                1.0,
                                                {"$divide": ["$$std", "$$avg"]},
                                            ]
                                        },
                                    ]
                                },
                            ]
                        },
                    }
                },
            }
        })

        # ── Stage 3: Window Bounds for Normalization ─────────────────────────
        # Uses $setWindowFields across the unbounded collection window to find
        # global min and max for accuracy, avg_response_time, and consistency.
        pipeline.append({
            "$setWindowFields": {
                "output": {
                    "min_accuracy": {
                        "$min": "$accuracy",
                        "window": {"documents": ["unbounded", "unbounded"]},
                    },
                    "max_accuracy": {
                        "$max": "$accuracy",
                        "window": {"documents": ["unbounded", "unbounded"]},
                    },
                    "min_avg_time": {
                        "$min": "$avg_response_time",
                        "window": {"documents": ["unbounded", "unbounded"]},
                    },
                    "max_avg_time": {
                        "$max": "$avg_response_time",
                        "window": {"documents": ["unbounded", "unbounded"]},
                    },
                    "min_consistency": {
                        "$min": "$consistency",
                        "window": {"documents": ["unbounded", "unbounded"]},
                    },
                    "max_consistency": {
                        "$max": "$consistency",
                        "window": {"documents": ["unbounded", "unbounded"]},
                    },
                }
            }
        })

        # ── Stage 4: Min-Max Normalization & Composite LVI Formula ───────────
        # Normalize each metric to [0, 1]:
        # - norm_accuracy = (accuracy - min) / (max - min)
        # - norm_avg_time = (avg_time - min) / (max - min)
        # - norm_consistency = (consistency - min) / (max - min)
        # Composite LVI = 0.5 * norm_accuracy + 0.3 * (1 - norm_avg_time) + 0.2 * norm_consistency
        # Handles edge cases where max == min (single user or identical metrics) by defaulting to 1.0 / 0.0.
        pipeline.append({
            "$project": {
                "user_id": 1,
                "accuracy": {"$round": ["$accuracy", 4]},
                "avg_response_time_ms": {"$round": ["$avg_response_time", 2]},
                "consistency_score": {"$round": ["$consistency", 4]},
                "learning_velocity_index": {
                    "$round": [
                        {
                            "$add": [
                                # 0.5 * norm_accuracy
                                {
                                    "$multiply": [
                                        WEIGHT_ACCURACY,
                                        {
                                            "$cond": [
                                                {"$eq": ["$max_accuracy", "$min_accuracy"]},
                                                1.0,
                                                {
                                                    "$divide": [
                                                        {"$subtract": ["$accuracy", "$min_accuracy"]},
                                                        {"$subtract": ["$max_accuracy", "$min_accuracy"]},
                                                    ]
                                                },
                                            ]
                                        },
                                    ]
                                },
                                # 0.3 * (1 - norm_avg_time)  [faster response time is better]
                                {
                                    "$multiply": [
                                        WEIGHT_SPEED,
                                        {
                                            "$subtract": [
                                                1.0,
                                                {
                                                    "$cond": [
                                                        {"$eq": ["$max_avg_time", "$min_avg_time"]},
                                                        0.0,
                                                        {
                                                            "$divide": [
                                                                {"$subtract": ["$avg_response_time", "$min_avg_time"]},
                                                                {"$subtract": ["$max_avg_time", "$min_avg_time"]},
                                                            ]
                                                        },
                                                    ]
                                                },
                                            ]
                                        },
                                    ]
                                },
                                # 0.2 * norm_consistency
                                {
                                    "$multiply": [
                                        WEIGHT_CONSISTENCY,
                                        {
                                            "$cond": [
                                                {"$eq": ["$max_consistency", "$min_consistency"]},
                                                1.0,
                                                {
                                                    "$divide": [
                                                        {"$subtract": ["$consistency", "$min_consistency"]},
                                                        {"$subtract": ["$max_consistency", "$min_consistency"]},
                                                    ]
                                                },
                                            ]
                                        },
                                    ]
                                },
                            ]
                        },
                        4,
                    ]
                },
            }
        })

        # ── Stage 5: Lookup User Display Name ─────────────────────────────────
        pipeline.append({
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user_info",
            }
        })

        # ── Stage 6: Extract User Name ────────────────────────────────────────
        pipeline.append({
            "$addFields": {
                "user_name": {
                    "$ifNull": [
                        {"$arrayElemAt": ["$user_info.name", 0]},
                        "Unknown User",
                    ]
                }
            }
        })

        # ── Stage 7: Clean Shape Projection ───────────────────────────────────
        pipeline.append({
            "$project": {
                "_id": 0,
                "user_id": {"$toString": "$user_id"},
                "user_name": 1,
                "accuracy": 1,
                "avg_response_time_ms": 1,
                "consistency_score": 1,
                "learning_velocity_index": 1,
            }
        })

        # ── Stage 8: Sort by Learning Velocity Index Descending ───────────────
        pipeline.append({
            "$sort": {
                "learning_velocity_index": -1,
                "accuracy": -1,
                "avg_response_time_ms": 1,
            }
        })

        cursor = self.attempts_collection.aggregate(pipeline)
        docs = await cursor.to_list(length=None)
        return [LearningVelocityItem.model_validate(doc) for doc in docs]

    async def get_fatigue_analysis(
        self,
        user_id: str | ObjectId | None = None,
        quiz_id: str | ObjectId | None = None,
        exam_id: str | ObjectId | None = None,
        subject_id: str | ObjectId | None = None,
        chapter_id: str | ObjectId | None = None,
        bucket_size: int = 5,
    ) -> list[FatigueBucketItem]:
        """
        Calculates Fatigue Analysis across question sequence positions.

        Modes (techstack.md §4.2):
          1. Per-quiz fatigue (quiz_id provided): within-session drop-off for a specific quiz attempt.
          2. Per-user aggregate fatigue (user_id provided): aggregated fatigue across all quizzes for a user.
          3. Systemic aggregate fatigue (no user/quiz provided): global fatigue pattern across all users.

        Pipeline Stages:
        ----------------
        0. [$match]: Filter on user_id, quiz_id, exam_id, subject_id, chapter_id as provided.
        1. Dynamic Boundaries: Determine maximum question_index_in_quiz to size boundaries [0, 5, 10, 15, ...]
           without hardcoding boundaries beyond actual existing data.
        2. [$bucket]: Group by question_index_in_quiz into dynamic boundaries:
           - Accumulates total_count, accuracy ($avg of conditional 1/0 for is_correct),
             and avg_response_time_ms ($avg of response_duration_ms).
        3. [$sort]: Order ascending by bucket lower bound.
        4. [$project]: Format the 1-based human-readable label "1-5", "6-10", "11-15", etc.
        """
        match_filter: dict[str, Any] = {}
        if user_id:
            match_filter["user_id"] = (
                ObjectId(user_id) if isinstance(user_id, str) and ObjectId.is_valid(user_id) else user_id
            )
        if quiz_id:
            match_filter["quiz_id"] = (
                ObjectId(quiz_id) if isinstance(quiz_id, str) and ObjectId.is_valid(quiz_id) else quiz_id
            )
        if exam_id:
            match_filter["exam_id"] = (
                ObjectId(exam_id) if isinstance(exam_id, str) and ObjectId.is_valid(exam_id) else exam_id
            )
        if subject_id:
            match_filter["subject_id"] = (
                ObjectId(subject_id) if isinstance(subject_id, str) and ObjectId.is_valid(subject_id) else subject_id
            )
        if chapter_id:
            match_filter["chapter_id"] = (
                ObjectId(chapter_id) if isinstance(chapter_id, str) and ObjectId.is_valid(chapter_id) else chapter_id
            )

        # 1. Find max question_index_in_quiz actually present in matching attempts
        max_attempt_doc = await self.attempts_collection.find_one(
            match_filter,
            sort=[("question_index_in_quiz", -1)],
            projection={"question_index_in_quiz": 1},
        )
        if not max_attempt_doc:
            return []

        max_index = max_attempt_doc.get("question_index_in_quiz", 0)
        # Sizing boundaries to cover all observed question indices: [0, 5, 10, 15, ...]
        max_boundary = ((max_index // bucket_size) + 1) * bucket_size
        boundaries = list(range(0, max_boundary + bucket_size + 1, bucket_size))
        # Ensure at least two boundaries for $bucket
        if len(boundaries) < 2:
            boundaries = [0, bucket_size]

        pipeline: list[dict[str, Any]] = []

        # ── Stage 0: Match Filter ─────────────────────────────────────────────
        if match_filter:
            pipeline.append({"$match": match_filter})

        # ── Stage 1: Bucket on question_index_in_quiz ─────────────────────────
        pipeline.append({
            "$bucket": {
                "groupBy": "$question_index_in_quiz",
                "boundaries": boundaries,
                "default": "other",
                "output": {
                    "total_count": {"$sum": 1},
                    "accuracy": {
                        "$avg": {
                            "$cond": [{"$eq": ["$is_correct", True]}, 1.0, 0.0]
                        }
                    },
                    "avg_response_time_ms": {"$avg": "$response_duration_ms"},
                },
            }
        })

        # ── Stage 2: Sort by bucket start index ascending ─────────────────────
        pipeline.append({"$sort": {"_id": 1}})

        # ── Stage 3: Project human-readable 1-based range and round metrics ───
        pipeline.append({
            "$project": {
                "_id": 0,
                "range": {
                    "$cond": [
                        {"$isNumber": "$_id"},
                        {
                            "$concat": [
                                {"$toString": {"$add": ["$_id", 1]}},
                                "-",
                                {"$toString": {"$add": ["$_id", bucket_size]}},
                            ]
                        },
                        {"$toString": "$_id"},
                    ]
                },
                "accuracy": {"$round": ["$accuracy", 4]},
                "avg_response_time_ms": {"$round": ["$avg_response_time_ms", 2]},
            }
        })

        cursor = self.attempts_collection.aggregate(pipeline)
        docs = await cursor.to_list(length=None)
        return [
            FatigueBucketItem.model_validate(doc)
            for doc in docs
            if doc.get("range") != "other"
        ]

    async def get_question_difficulty_index(
        self,
        exam_id: str | ObjectId | None = None,
        subject_id: str | ObjectId | None = None,
        chapter_id: str | ObjectId | None = None,
    ) -> list[QuestionDifficultyItem]:
        """
        Calculates the Question Difficulty Index across all questions.

        Pipeline Stages:
        ----------------
        0. [$match]: Optional filter by exam_id, subject_id, or chapter_id (techstack.md §4.4)
        1. [$group]: Group by question_id -> total attempts, correct count,
           avg response duration, and chapter_id.
        2. [$project]: Compute raw accuracy (correct / total) and avg response time.
        3. [$setWindowFields]: Compute global min & max across the entire question set for
           accuracy and avg_response_time for global min-max normalization.
        4. [$project]: Min-max normalize dimensions to [0, 1] and compute composite difficulty_score:
           difficulty_score = 0.6 * (1 - norm_accuracy) + 0.4 * norm_avg_time.
        5. [$lookup]: Join with `questions` collection to retrieve question text.
        6. [$lookup]: Join with `chapters` collection to retrieve chapter name.
        7. [$project]: Format output schema matching techstack.md §4.3.
        8. [$sort]: Order descending by difficulty_score (hardest questions first).
        """
        pipeline: list[dict[str, Any]] = []

        # ── Stage 0: Optional Filter Match ────────────────────────────────────
        match_filters: dict[str, Any] = {}
        if exam_id:
            match_filters["exam_id"] = (
                ObjectId(exam_id) if isinstance(exam_id, str) and ObjectId.is_valid(exam_id) else exam_id
            )
        if subject_id:
            match_filters["subject_id"] = (
                ObjectId(subject_id) if isinstance(subject_id, str) and ObjectId.is_valid(subject_id) else subject_id
            )
        if chapter_id:
            match_filters["chapter_id"] = (
                ObjectId(chapter_id) if isinstance(chapter_id, str) and ObjectId.is_valid(chapter_id) else chapter_id
            )

        if match_filters:
            pipeline.append({"$match": match_filters})

        # ── Stage 1: Group by question_id ─────────────────────────────────────
        # Accumulate total attempts, correct count, avg response time, and chapter_id.
        pipeline.append({
            "$group": {
                "_id": "$question_id",
                "total_attempts": {"$sum": 1},
                "correct_count": {
                    "$sum": {"$cond": [{"$eq": ["$is_correct", True]}, 1, 0]}
                },
                "avg_response_time": {"$avg": "$response_duration_ms"},
                "chapter_id": {"$first": "$chapter_id"},
            }
        })

        # ── Stage 2: Compute Raw Accuracy and Avg Response Time ───────────────
        pipeline.append({
            "$project": {
                "question_id": "$_id",
                "total_attempts": 1,
                "chapter_id": 1,
                "accuracy": {
                    "$cond": [
                        {"$eq": ["$total_attempts", 0]},
                        0.0,
                        {"$divide": ["$correct_count", "$total_attempts"]},
                    ]
                },
                "avg_response_time": {"$ifNull": ["$avg_response_time", 0.0]},
            }
        })

        # ── Stage 3: Global Window Bounds for Normalization ───────────────────
        pipeline.append({
            "$setWindowFields": {
                "output": {
                    "min_accuracy": {
                        "$min": "$accuracy",
                        "window": {"documents": ["unbounded", "unbounded"]},
                    },
                    "max_accuracy": {
                        "$max": "$accuracy",
                        "window": {"documents": ["unbounded", "unbounded"]},
                    },
                    "min_avg_time": {
                        "$min": "$avg_response_time",
                        "window": {"documents": ["unbounded", "unbounded"]},
                    },
                    "max_avg_time": {
                        "$max": "$avg_response_time",
                        "window": {"documents": ["unbounded", "unbounded"]},
                    },
                }
            }
        })

        # ── Stage 4: Min-Max Normalization & Difficulty Formula ───────────────
        # Normalized accuracy: (accuracy - min) / (max - min)
        # Normalized time: (avg_time - min) / (max - min)
        # Harder questions have lower accuracy (1 - norm_acc) and higher response time (norm_time)
        # Composite score = 0.6 * (1 - norm_acc) + 0.4 * norm_time
        pipeline.append({
            "$project": {
                "question_id": 1,
                "chapter_id": 1,
                "total_attempts": 1,
                "accuracy": 1,
                "avg_response_time": 1,
                "difficulty_score": {
                    "$round": [
                        {
                            "$add": [
                                # 0.6 * (1 - norm_accuracy) [lower accuracy = harder]
                                {
                                    "$multiply": [
                                        WEIGHT_DIFFICULTY_ACCURACY,
                                        {
                                            "$subtract": [
                                                1.0,
                                                {
                                                    "$cond": [
                                                        {"$eq": ["$max_accuracy", "$min_accuracy"]},
                                                        1.0,
                                                        {
                                                            "$divide": [
                                                                {"$subtract": ["$accuracy", "$min_accuracy"]},
                                                                {"$subtract": ["$max_accuracy", "$min_accuracy"]},
                                                            ]
                                                        },
                                                    ]
                                                },
                                            ]
                                        },
                                    ]
                                },
                                # 0.4 * norm_avg_time [longer response time = harder]
                                {
                                    "$multiply": [
                                        WEIGHT_DIFFICULTY_TIME,
                                        {
                                            "$cond": [
                                                {"$eq": ["$max_avg_time", "$min_avg_time"]},
                                                0.0,
                                                {
                                                    "$divide": [
                                                        {"$subtract": ["$avg_response_time", "$min_avg_time"]},
                                                        {"$subtract": ["$max_avg_time", "$min_avg_time"]},
                                                    ]
                                                },
                                            ]
                                        },
                                    ]
                                },
                            ]
                        },
                        4,
                    ]
                },
            }
        })

        # ── Stage 5: Lookup Question Details ──────────────────────────────────
        pipeline.append({
            "$lookup": {
                "from": "questions",
                "localField": "question_id",
                "foreignField": "_id",
                "as": "question_info",
            }
        })

        # ── Stage 6: Lookup Chapter Details ───────────────────────────────────
        pipeline.append({
            "$lookup": {
                "from": "chapters",
                "localField": "chapter_id",
                "foreignField": "_id",
                "as": "chapter_info",
            }
        })

        # ── Stage 7: Clean Shape Projection ───────────────────────────────────
        pipeline.append({
            "$project": {
                "_id": 0,
                "question_id": {"$toString": "$question_id"},
                "question_text": {
                    "$ifNull": [
                        {"$arrayElemAt": ["$question_info.text", 0]},
                        "Unknown Question Text",
                    ]
                },
                "chapter": {
                    "$ifNull": [
                        {"$arrayElemAt": ["$chapter_info.name", 0]},
                        "Unknown Chapter",
                    ]
                },
                "total_attempts": "$total_attempts",
                "accuracy_pct": {"$round": ["$accuracy", 4]},
                "avg_response_time_ms": {"$round": ["$avg_response_time", 2]},
                "difficulty_score": "$difficulty_score",
            }
        })

        # ── Stage 8: Sort Descending by Difficulty (Hardest First) ────────────
        pipeline.append({
            "$sort": {
                "difficulty_score": -1,
                "total_attempts": -1,
            }
        })

        cursor = self.attempts_collection.aggregate(pipeline)
        docs = await cursor.to_list(length=None)
        return [QuestionDifficultyItem.model_validate(doc) for doc in docs]
