"""
End-to-End integration test for the full QuizChat flow:
Login -> Exams -> Subjects -> Chapters -> Full Quiz Session (15 questions) -> Results -> Analytics
"""

import asyncio
from datetime import datetime, timezone
import pytest
from bson import ObjectId
from fastapi.testclient import TestClient

from app.main import create_app
from app.core.db import get_database


class InMemoryAsyncCollection:
    """In-memory collection mock for full end-to-end route testing."""

    def __init__(self, name: str):
        self.name = name
        self.documents: list[dict] = []

    def _matches_filter(self, doc: dict, filter_dict: dict) -> bool:
        for k, v in filter_dict.items():
            if isinstance(v, dict):
                if "$in" in v:
                    if doc.get(k) not in v["$in"]:
                        return False
                elif "$eq" in v:
                    if doc.get(k) != v["$eq"]:
                        return False
            else:
                if doc.get(k) != v:
                    return False
        return True

    async def insert_one(self, doc: dict):
        d = dict(doc)
        if "_id" not in d:
            d["_id"] = ObjectId()
        self.documents.append(d)
        res = type("InsertResult", (), {"inserted_id": d["_id"]})()
        return res

    async def insert_many(self, docs: list[dict]):
        inserted_ids = []
        for doc in docs:
            d = dict(doc)
            if "_id" not in d:
                d["_id"] = ObjectId()
            self.documents.append(d)
            inserted_ids.append(d["_id"])
        res = type("InsertManyResult", (), {"inserted_ids": inserted_ids})()
        return res

    async def find_one(self, filter_dict: dict, projection: dict | None = None, sort=None):
        matching = [doc for doc in self.documents if self._matches_filter(doc, filter_dict)]
        if not matching:
            return None

        if sort:
            sort_field, sort_order = sort[0]
            matching.sort(key=lambda d: d.get(sort_field, 0), reverse=(sort_order == -1))

        return matching[0]

    def find(self, filter_dict: dict = None, projection: dict | None = None, sort=None):
        if filter_dict is None:
            filter_dict = {}

        matching = [doc for doc in self.documents if self._matches_filter(doc, filter_dict)]

        class Cursor:
            def __init__(self, docs):
                self._docs = docs

            def sort(self, key_or_list, direction=None):
                return self

            async def to_list(self, length=None):
                if length is not None:
                    return self._docs[:length]
                return self._docs

        return Cursor(matching)

    async def update_one(self, filter_dict: dict, update_dict: dict):
        doc = await self.find_one(filter_dict)
        if not doc:
            return type("UpdateResult", (), {"matched_count": 0, "modified_count": 0})()

        if "$set" in update_dict:
            for k, v in update_dict["$set"].items():
                doc[k] = v
        if "$inc" in update_dict:
            for k, v in update_dict["$inc"].items():
                doc[k] = doc.get(k, 0) + v

        return type("UpdateResult", (), {"matched_count": 1, "modified_count": 1})()

    def aggregate(self, pipeline: list[dict]):
        data = list(self.documents)
        for stage in pipeline:
            if "$match" in stage:
                m = stage["$match"]
                data = [d for d in data if self._matches_filter(d, m)]
            elif "$sample" in stage:
                size = stage["$sample"].get("size", len(data))
                data = data[:size]

        class AggCursor:
            def __init__(self, data):
                self._data = data

            async def to_list(self, length=None):
                if length is not None:
                    return self._data[:length]
                return self._data

        return AggCursor(data)


@pytest.fixture
def e2e_environment():
    """Sets up an in-memory test database populated with curriculum and users."""
    app = create_app()

    collections: dict[str, InMemoryAsyncCollection] = {
        "users": InMemoryAsyncCollection("users"),
        "exams": InMemoryAsyncCollection("exams"),
        "subjects": InMemoryAsyncCollection("subjects"),
        "chapters": InMemoryAsyncCollection("chapters"),
        "questions": InMemoryAsyncCollection("questions"),
        "quizzes": InMemoryAsyncCollection("quizzes"),
        "question_attempts": InMemoryAsyncCollection("question_attempts"),
    }

    mock_db = type("MockDB", (), {
        "__getitem__": lambda self, name: collections[name]
    })()

    app.dependency_overrides[get_database] = lambda: mock_db
    client = TestClient(app)

    # Seed data
    user_id = ObjectId()
    collections["users"].documents.append({"_id": user_id, "name": "Aarav Sharma"})

    exam_id = ObjectId()
    collections["exams"].documents.append({
        "_id": exam_id,
        "name": "JEE Advanced",
        "description": "Joint Entrance Examination Advanced Track",
    })

    subject_id = ObjectId()
    collections["subjects"].documents.append({
        "_id": subject_id,
        "exam_id": exam_id,
        "name": "Physics",
    })

    chapter_id = ObjectId()
    collections["chapters"].documents.append({
        "_id": chapter_id,
        "exam_id": exam_id,
        "subject_id": subject_id,
        "name": "Kinematics",
    })

    # 15 Questions for this chapter
    question_ids = []
    for i in range(15):
        q_id = ObjectId()
        question_ids.append(q_id)
        collections["questions"].documents.append({
            "_id": q_id,
            "exam_id": exam_id,
            "subject_id": subject_id,
            "chapter_id": chapter_id,
            "text": f"Kinematics Problem {i+1}: What is the instantaneous velocity?",
            "options": [
                {"key": "A", "text": "v = u + at"},
                {"key": "B", "text": "s = ut + 0.5at^2"},
                {"key": "C", "text": "v^2 = u^2 + 2as"},
                {"key": "D", "text": "None of the above"},
            ],
            "correct_option": "A",
        })

    return {
        "client": client,
        "collections": collections,
        "user_id": user_id,
        "exam_id": exam_id,
        "subject_id": subject_id,
        "chapter_id": chapter_id,
        "question_ids": question_ids,
    }


def test_full_user_quiz_analytics_flow(e2e_environment):
    client: TestClient = e2e_environment["client"]
    user_id = e2e_environment["user_id"]
    exam_id = e2e_environment["exam_id"]
    subject_id = e2e_environment["subject_id"]
    chapter_id = e2e_environment["chapter_id"]

    # ── Step 1: List Users ───────────────────────────────────────────────────
    res_users = client.get("/api/users")
    assert res_users.status_code == 200
    users_list = res_users.json()
    assert len(users_list) >= 1
    assert users_list[0]["id"] == str(user_id)
    assert users_list[0]["name"] == "Aarav Sharma"

    # ── Step 2: Login ────────────────────────────────────────────────────────
    res_login = client.post("/api/auth/login", json={"user_id": str(user_id)})
    assert res_login.status_code == 200
    login_data = res_login.json()
    assert "access_token" in login_data
    token = login_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # ── Step 3: Browse Exams ─────────────────────────────────────────────────
    res_exams = client.get("/api/exams")
    assert res_exams.status_code == 200
    exams = res_exams.json()
    assert len(exams) >= 1
    assert exams[0]["id"] == str(exam_id)

    # ── Step 4: Browse Subjects ──────────────────────────────────────────────
    res_subjects = client.get(f"/api/exams/{str(exam_id)}/subjects")
    assert res_subjects.status_code == 200
    subjects = res_subjects.json()
    assert len(subjects) >= 1
    assert subjects[0]["id"] == str(subject_id)

    # ── Step 5: Browse Chapters ──────────────────────────────────────────────
    res_chapters = client.get(f"/api/subjects/{str(subject_id)}/chapters")
    assert res_chapters.status_code == 200
    chapters = res_chapters.json()
    assert len(chapters) >= 1
    assert chapters[0]["id"] == str(chapter_id)

    # ── Step 6: Create Quiz Session ──────────────────────────────────────────
    res_quiz = client.post("/api/quizzes", json={"chapter_id": str(chapter_id)}, headers=headers)
    assert res_quiz.status_code == 201
    quiz_data = res_quiz.json()
    quiz_id = quiz_data["quiz_id"]
    first_q = quiz_data["question"]
    assert "correct_option" not in first_q
    assert len(first_q["options"]) == 4

    # ── Step 7: Answer Full 15-Question Quiz Session ─────────────────────────
    current_q_id = first_q["id"]
    for q_idx in range(15):
        # 1. Fetch current question
        res_curr = client.get(f"/api/quizzes/{quiz_id}/current-question", headers=headers)
        assert res_curr.status_code == 200
        curr_q = res_curr.json()
        assert curr_q["id"] == current_q_id
        assert "correct_option" not in curr_q

        # 2. Submit answer (alternating A [correct] and B [incorrect])
        selected_option = "A" if q_idx % 2 == 0 else "B"
        res_submit = client.post(
            f"/api/quizzes/{quiz_id}/submit",
            json={"question_id": current_q_id, "selected_option": selected_option},
            headers=headers,
        )
        assert res_submit.status_code == 200
        submit_data = res_submit.json()
        assert submit_data["correct_option"] == "A"
        assert submit_data["is_correct"] == (selected_option == "A")

        if q_idx < 14:
            assert submit_data["next_question"] is not None
            current_q_id = submit_data["next_question"]["id"]
        else:
            assert submit_data["next_question"] is None

    # ── Step 8: Quiz Result Summary ──────────────────────────────────────────
    res_result = client.get(f"/api/quizzes/{quiz_id}/result", headers=headers)
    assert res_result.status_code == 200
    result_data = res_result.json()
    assert result_data["total_questions"] == 15
    assert result_data["score"] == 8  # 8 correct (indices 0,2,4,6,8,10,12,14)
    assert pytest.approx(result_data["accuracy_pct"], rel=1e-2) == 53.33
    assert result_data["exam_name"] == "JEE Advanced"
    assert result_data["subject_name"] == "Physics"
    assert result_data["chapter_name"] == "Kinematics"

    # ── Step 9: Verify 15 Attempts Inserted ───────────────────────────────────
    attempts_coll = e2e_environment["collections"]["question_attempts"]
    assert len(attempts_coll.documents) == 15
    for attempt in attempts_coll.documents:
        assert attempt["user_id"] == user_id
        assert attempt["exam_id"] == exam_id
        assert attempt["subject_id"] == subject_id
        assert attempt["chapter_id"] == chapter_id
        assert "response_duration_ms" in attempt
        assert "question_shown_at" in attempt
        assert "answer_submitted_at" in attempt

    print("FULL E2E INTEGRATION FLOW PASSED PERFECTLY!")
