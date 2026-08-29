"""
Deterministic database seeder for QuizChat.

Usage:
    python -m app.scripts.seed_data [--force]

Populates MongoDB with:
  - 3 Exams (JEE Main, NEET UG, UPSC CSE)
  - 11 Subjects distributed across exams
  - 30 Chapters distributed across subjects
  - 500 Questions with 4 options and single correct_option
  - 50 Users with realistic Indian names
  - ~50 Completed Quiz sessions and ~750 Historical Question Attempts for rich analytics

Reproducibility:
    Uses a fixed random seed (42) so all generated ObjectIds and text remain
    deterministic across re-runs.
"""

import argparse
import asyncio
import certifi
from datetime import datetime, timedelta, timezone
import logging
import random
import sys
from typing import Sequence

from bson import ObjectId
from faker import Faker
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings
from app.core.indexes import create_indexes
from app.models import Chapter, Exam, Option, Question, User, Quiz, QuestionAttempt

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# Fixed seed for deterministic data generation
RANDOM_SEED = 42

# Structured domain data for exams, subjects, and chapters
EXAM_CURRICULUM = [
    {
        "name": "JEE Main",
        "description": "National level engineering entrance examination covering Physics, Chemistry, and Mathematics.",
        "subjects": [
            {
                "name": "Physics",
                "chapters": [
                    "Kinematics & Dynamics",
                    "Work, Energy & Power",
                    "Rotational Motion",
                    "Thermodynamics & Heat Transfer",
                    "Optics & Wave Motion",
                ],
            },
            {
                "name": "Chemistry",
                "chapters": [
                    "Atomic Structure",
                    "Chemical Bonding & Molecular Structure",
                    "Electrochemistry & Solutions",
                    "Organic Chemistry Reaction Mechanisms",
                ],
            },
            {
                "name": "Mathematics",
                "chapters": [
                    "Differential Calculus",
                    "Integral Calculus",
                    "Coordinate Geometry & Conic Sections",
                    "Vectors & 3D Geometry",
                    "Matrices & Determinants",
                ],
            },
        ],
    },
    {
        "name": "NEET UG",
        "description": "National Eligibility cum Entrance Test for undergraduate medical admissions.",
        "subjects": [
            {
                "name": "Botany",
                "chapters": [
                    "Plant Anatomy & Morphology",
                    "Photosynthesis & Respiration",
                    "Plant Reproduction & Genetics",
                ],
            },
            {
                "name": "Zoology",
                "chapters": [
                    "Animal Kingdom & Classification",
                    "Genetics, Evolution & Ecology",
                    "Biotechnology & Applications",
                ],
            },
            {
                "name": "Human Physiology",
                "chapters": [
                    "Neural Control & Coordination",
                    "Circulatory & Respiratory Systems",
                    "Chemical Coordination & Integration",
                ],
            },
            {
                "name": "Physical Chemistry",
                "chapters": [
                    "Chemical Equilibrium",
                    "Thermodynamics & Energetics",
                    "Solutions & Colligative Properties",
                ],
            },
        ],
    },
    {
        "name": "UPSC CSE",
        "description": "Civil Services Examination for recruitment to premier administrative services.",
        "subjects": [
            {
                "name": "Indian Polity",
                "chapters": [
                    "Constitutional Framework & Preamble",
                    "Fundamental Rights & Duties",
                    "Union & State Executive",
                    "Judiciary & Constitutional Bodies",
                ],
            },
            {
                "name": "Modern Indian History",
                "chapters": [
                    "Revolt of 1857 & Early Resistance",
                    "Indian National Movement & Independence",
                    "Post-Independence Consolidation",
                ],
            },
            {
                "name": "Economics",
                "chapters": [
                    "National Income & Macroeconomic Indicators",
                    "Monetary Policy & Banking System",
                    "Fiscal Policy, Budget & Taxation",
                ],
            },
            {
                "name": "Geography",
                "chapters": [
                    "Physical Geography & Geomorphology",
                    "Indian Monsoon & Climate Systems",
                    "Economic & Resource Geography",
                ],
            },
        ],
    },
]

# Question sentence templates for plausible generation
QUESTION_TEMPLATES = [
    "In the context of {chapter}, which of the following statements regarding {concept} is correct?",
    "What is the primary significance of {concept} when studying {chapter} in {subject}?",
    "Consider the fundamental principles of {chapter}. How does {concept} influence the system's behaviour?",
    "Under standard conditions in {chapter}, what occurs when {concept} is applied?",
    "Which of the following best characterizes the relationship between {concept} and observed outcomes in {chapter}?",
    "When evaluating {concept} in {chapter}, what key assumption is typically made?",
    "Identify the primary law or governing mechanism applicable to {concept} in {chapter}.",
    "In a real-world scenario involving {chapter}, how is {concept} effectively measured?",
]


def seed_generator(
    fake: Faker,
    num_users: int = 50,
    target_questions: int = 500,
) -> tuple[
    list[User],
    list[Exam],
    list[dict],  # Subject docs
    list[Chapter],
    list[Question],
    list[Quiz],
    list[QuestionAttempt],
]:
    """
    Generate all deterministic entities in memory.
    """
    now = datetime.now(timezone.utc)

    # 1. Generate Users
    users: list[User] = []
    for _ in range(num_users):
        created_at = now - timedelta(
            days=random.randint(1, 90),
            minutes=random.randint(0, 1440),
        )
        user = User(
            _id=ObjectId(),
            name=fake.name(),
            created_at=created_at,
        )
        users.append(user)

    # 2. Generate Exams, Subjects, and Chapters
    exams: list[Exam] = []
    subjects: list[dict] = []
    chapters: list[Chapter] = []

    for exam_spec in EXAM_CURRICULUM:
        exam_id = ObjectId()
        exam = Exam(
            _id=exam_id,
            name=exam_spec["name"],
            description=exam_spec["description"],
        )
        exams.append(exam)

        for subj_spec in exam_spec["subjects"]:
            subject_id = ObjectId()
            subjects.append(
                {
                    "_id": subject_id,
                    "exam_id": exam_id,
                    "name": subj_spec["name"],
                }
            )

            for chapter_name in subj_spec["chapters"]:
                chapter_id = ObjectId()
                chapter = Chapter(
                    _id=chapter_id,
                    exam_id=exam_id,
                    subject_id=subject_id,
                    name=chapter_name,
                )
                chapters.append(chapter)

    # 3. Generate Questions distributed across chapters
    questions: list[Question] = []
    questions_by_chapter: dict[str, list[Question]] = {}
    total_chapters = len(chapters)
    base_per_chapter = target_questions // total_chapters
    remainder = target_questions % total_chapters

    for idx, chapter in enumerate(chapters):
        count_for_this_chapter = base_per_chapter + (1 if idx < remainder else 0)
        subject_name = next(
            s["name"] for s in subjects if s["_id"] == chapter.subject_id
        )

        chapter_questions: list[Question] = []
        for _ in range(count_for_this_chapter):
            template = random.choice(QUESTION_TEMPLATES)
            concept = fake.catch_phrase().lower()
            q_text = template.format(
                chapter=chapter.name,
                concept=concept,
                subject=subject_name,
            )

            # Generate 4 options: A, B, C, D
            correct_key = random.choice(["A", "B", "C", "D"])
            options = [
                Option(
                    key="A",
                    text=f"{fake.bs().capitalize()} with respect to {fake.word()}.",
                ),
                Option(
                    key="B",
                    text=f"{fake.bs().capitalize()} leading to increased {fake.word()}.",
                ),
                Option(
                    key="C",
                    text=f"Proportional variation in {fake.word()} maintaining constant {fake.word()}.",
                ),
                Option(
                    key="D",
                    text=f"Inversion of {fake.word()} across subsequent stages.",
                ),
            ]

            q_created_at = now - timedelta(
                days=random.randint(10, 120),
                minutes=random.randint(0, 1440),
            )

            question = Question(
                _id=ObjectId(),
                exam_id=chapter.exam_id,
                subject_id=chapter.subject_id,
                chapter_id=chapter.id,
                text=q_text,
                options=options,
                correct_option=correct_key,
                created_at=q_created_at,
            )
            questions.append(question)
            chapter_questions.append(question)

        questions_by_chapter[str(chapter.id)] = chapter_questions

    # 4. Generate Historical Completed Quizzes & Question Attempts
    quizzes: list[Quiz] = []
    attempts: list[QuestionAttempt] = []

    # Generate 1 to 2 completed quizzes for ~35 users
    for user in users[:35]:
        num_quizzes_for_user = random.randint(1, 2)
        for _ in range(num_quizzes_for_user):
            chapter = random.choice(chapters)
            avail_q = questions_by_chapter.get(str(chapter.id), [])
            if len(avail_q) < 10:
                continue

            sampled_questions = random.sample(avail_q, min(15, len(avail_q)))
            quiz_id = ObjectId()
            quiz_start_time = now - timedelta(days=random.randint(1, 30), minutes=random.randint(0, 700))
            running_time = quiz_start_time
            score = 0

            # Base user capability (accuracy baseline 40% - 90%)
            user_skill = random.uniform(0.40, 0.90)

            for q_idx, q in enumerate(sampled_questions):
                # Pacing latency with slight fatigue slowdown (3s - 12s)
                duration_ms = int(random.gauss(4500 + q_idx * 150, 1200))
                duration_ms = max(1800, min(18000, duration_ms))

                # Accuracy with slight fatigue drop-off
                is_correct = random.random() < max(0.25, user_skill - (q_idx * 0.015))
                if is_correct:
                    selected_opt = q.correct_option
                    score += 1
                else:
                    distractors = [k for k in ["A", "B", "C", "D"] if k != q.correct_option]
                    selected_opt = random.choice(distractors)

                shown_at = running_time
                running_time = shown_at + timedelta(milliseconds=duration_ms)
                submitted_at = running_time

                attempt = QuestionAttempt(
                    _id=ObjectId(),
                    user_id=user.id,
                    quiz_id=quiz_id,
                    question_id=q.id,
                    exam_id=chapter.exam_id,
                    subject_id=chapter.subject_id,
                    chapter_id=chapter.id,
                    question_index_in_quiz=q_idx,
                    question_shown_at=shown_at,
                    answer_submitted_at=submitted_at,
                    response_duration_ms=duration_ms,
                    selected_option=selected_opt,
                    is_correct=is_correct,
                )
                attempts.append(attempt)

            quiz = Quiz(
                _id=quiz_id,
                user_id=user.id,
                exam_id=chapter.exam_id,
                subject_id=chapter.subject_id,
                chapter_id=chapter.id,
                question_ids=[q.id for q in sampled_questions],
                status="completed",
                current_index=len(sampled_questions),
                score=score,
                started_at=quiz_start_time,
                completed_at=running_time,
            )
            quizzes.append(quiz)

    return users, exams, subjects, chapters, questions, quizzes, attempts


async def wipe_database(db: AsyncIOMotorDatabase) -> None:
    """
    Wipe all project collections before reseeding.
    """
    collections = [
        "users",
        "exams",
        "subjects",
        "chapters",
        "questions",
        "quizzes",
        "question_attempts",
    ]
    logger.info("Wiping existing collections: %s", ", ".join(collections))
    for coll in collections:
        await db[coll].delete_many({})


async def seed_database(force: bool = False) -> None:
    """
    Main seeding routine.
    """
    if not force:
        if not sys.stdin.isatty():
            logger.error("Non-interactive shell without --force. Aborting.")
            sys.exit(1)
        confirm = input(
            f"WARNING: This will wipe and reseed '{settings.mongo_db_name}'. Continue? [y/N]: "
        )
        if confirm.strip().lower() not in ("y", "yes"):
            logger.info("Seeding aborted by user.")
            return

    # Seed RNGs for determinism
    random.seed(RANDOM_SEED)
    Faker.seed(RANDOM_SEED)
    fake = Faker("en_IN")

    logger.info("Connecting to MongoDB at '%s'...", settings.mongo_uri)
    kwargs = {}
    uri_lower = settings.mongo_uri.lower()
    if "mongodb+srv://" in uri_lower or "ssl=true" in uri_lower or "tls=true" in uri_lower:
        kwargs["tlsCAFile"] = certifi.where()

    client = AsyncIOMotorClient(settings.mongo_uri, **kwargs)
    db = client[settings.mongo_db_name]

    try:
        # 1. Wipe collections
        await wipe_database(db)

        # 2. Generate entities
        logger.info("Generating dataset with seed=%d...", RANDOM_SEED)
        users, exams, subjects, chapters, questions, quizzes, attempts = seed_generator(
            fake=fake,
            num_users=settings.seed_num_users,
            target_questions=settings.seed_num_questions,
        )

        # 3. Bulk insert entities
        logger.info("Inserting %d users...", len(users))
        if users:
            await db.users.insert_many([u.to_mongo() for u in users])

        logger.info("Inserting %d exams...", len(exams))
        if exams:
            await db.exams.insert_many([e.to_mongo() for e in exams])

        logger.info("Inserting %d subjects...", len(subjects))
        if subjects:
            await db.subjects.insert_many(subjects)

        logger.info("Inserting %d chapters...", len(chapters))
        if chapters:
            await db.chapters.insert_many([c.to_mongo() for c in chapters])

        logger.info("Inserting %d questions...", len(questions))
        if questions:
            await db.questions.insert_many([q.to_mongo() for q in questions])

        logger.info("Inserting %d historical quiz sessions...", len(quizzes))
        if quizzes:
            await db.quizzes.insert_many([qz.to_mongo() for qz in quizzes])

        logger.info("Inserting %d historical question attempts...", len(attempts))
        if attempts:
            await db.question_attempts.insert_many([att.to_mongo() for att in attempts])

        # 4. Create and verify indexes
        await create_indexes(db)

        # 5. Summary counts verification
        user_count = await db.users.count_documents({})
        exam_count = await db.exams.count_documents({})
        subject_count = await db.subjects.count_documents({})
        chapter_count = await db.chapters.count_documents({})
        question_count = await db.questions.count_documents({})
        quiz_count = await db.quizzes.count_documents({})
        qa_count = await db.question_attempts.count_documents({})

        print("\n" + "=" * 68)
        print(f"  QuizChat Database Seeding Summary (Random Seed: {RANDOM_SEED})")
        print("=" * 68)
        print(f"  {'Collection':<25} | {'Count':<10} | {'Status'}")
        print("-" * 68)
        print(f"  {'users':<25} | {user_count:<10} | Seeded")
        print(f"  {'exams':<25} | {exam_count:<10} | Seeded")
        print(f"  {'subjects':<25} | {subject_count:<10} | Seeded")
        print(f"  {'chapters':<25} | {chapter_count:<10} | Seeded")
        print(f"  {'questions':<25} | {question_count:<10} | Seeded")
        print(f"  {'quizzes':<25} | {quiz_count:<10} | Seeded (Historical)")
        print(f"  {'question_attempts':<25} | {qa_count:<10} | Seeded (Historical)")
        print("=" * 68)
        print("  Database seeding completed successfully!\n")

    finally:
        client.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed QuizChat MongoDB database.")
    parser.add_argument(
        "--force",
        "-f",
        action="store_true",
        help="Bypass interactive confirmation prompt to wipe and re-seed.",
    )
    args = parser.parse_args()
    asyncio.run(seed_database(force=args.force))


if __name__ == "__main__":
    main()
