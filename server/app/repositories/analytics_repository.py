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
from app.schemas.analytics import LearningVelocityItem

# ── Learning Velocity Index (LVI) Constants (techstack.md §4.1) ───────────────
# The composite index balances accuracy, speed (inverted response time),
# and scale-independent consistency.
WEIGHT_ACCURACY: float = 0.5
WEIGHT_SPEED: float = 0.3
WEIGHT_CONSISTENCY: float = 0.2


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
