# QuizChat ⚡💬

> A production-grade, WhatsApp-style adaptive quiz platform and learning analytics engine built with **FastAPI**, **MongoDB**, and **React**.

QuizChat transforms test preparation into an intuitive, chat-first conversation thread. Questions slide in as incoming message cards, answers are submitted as interactive bubble replies, and every learner response is tracked as an immutable event to power multi-dimensional learning analytics (Learning Velocity, Fatigue Progression, and Question Difficulty).

---

## 📑 Table of Contents

- [Architectural Highlights](#-architectural-highlights)
- [Tech Stack](#-tech-stack)
- [Quick Start with Docker Compose](#-quick-start-with-docker-compose)
- [Local Development Setup](#-local-development-setup)
- [Deployment](#-deployment)
- [Seed Dataset](#-seed-dataset)
- [API Overview & Swagger Docs](#-api-overview--swagger-docs)
- [Database Schema & Design Decisions](#-database-schema--design-decisions)
- [Analytics Pipelines & Mathematical Assumptions](#-analytics-pipelines--mathematical-assumptions)
- [Automated Testing Suite](#-automated-testing-suite)
- [Assumptions & Known Limitations](#-assumptions--known-limitations)

---

## 🌟 Architectural Highlights

1. **WhatsApp-Style Chat UI**:
   - Questions appear as incoming left-aligned bubbles (`Q1`, `Q2`...) with topic tags and timestamps.
   - 4-option response tray with immediate UI locking to eliminate race conditions.
   - User choices render as outgoing right-aligned bubbles with instantaneous correctness badges (`✓ Correct` or `✕ Incorrect`).
   - Smooth auto-scrolling and Framer Motion spring transitions between question turns.
   - **Strict Irreversibility**: UI physically prevents going back or modifying previous answers, enforced server-side.
   - **Chat Refresh Resilience**: `previous_attempts` payload enables frontend to reconstruct chat history on page refresh without data loss.

2. **Immutable Event Log Architecture**:
   - Every single question attempt is logged as an independent, 12-field document in `question_attempts`.
   - Server-side duration tracking: `response_duration_ms = answer_submitted_at - question_shown_at`.
   - Optimized with compound B-Tree indexes for high-throughput OLAP aggregation pipelines.

3. **Composite Learning Analytics Suite**:
   - **Learning Velocity Index (LVI)**: Global min-max normalized weighted composite score balancing Accuracy (50%), Pacing (30%), and Scale-Independent Consistency (20%).
   - **Fatigue Drop-off Analysis**: Aggregates question-sequence buckets (`1-5`, `6-10`, `11-15`...) using `$bucket` to visualize cognitive stamina degradation and response latency trends.
   - **Question Difficulty Index (QDI)**: Ranks hardest curriculum problems by weighting low accuracy (60%) and high attempt duration (40%).

4. **Anti-Cheat & Quiz Integrity**:
   - `correct_option` is stripped from all client-facing question responses; only revealed in `SubmitAnswerResponse` after the answer is committed.
   - Out-of-order / skipping protection: submitting for the wrong question ID returns `409 Conflict`.
   - Inactivity timeout: quiz auto-abandons after 10 minutes of inactivity.

---

## 🛠️ Tech Stack

| Layer | Technology | Key Libraries / Features |
|---|---|---|
| **Frontend** | React 18 + Vite 5 + TypeScript | TanStack Query v5, Zustand v5, Framer Motion v11, Recharts v2, Tailwind CSS, React Router v6 |
| **Backend** | Python 3.12+ / FastAPI | Pydantic v2, Motor (AsyncIOMotorClient), PyJWT (python-jose), AnyIO |
| **Database** | MongoDB 7.0 | Compound Indexes, Aggregation Pipeline, `$setWindowFields`, `$bucket`, `$sample` |
| **Testing** | Pytest 8 + Pytest-Asyncio | In-memory async MongoDB mocks, mathematical unit tests, full E2E lifecycle test suite |
| **Containerization** | Docker & Docker Compose | Multi-container composition with automated healthchecks |

---

## 🚀 Quick Start with Docker Compose

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (v24+)
- [Docker Compose](https://docs.docker.com/compose/) (v2+)

### 1. Clone Repository & Setup Environment

```bash
git clone https://github.com/ombiswas/quizchat.git
cd quizchat

# Copy environment files
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### 2. Start Application Services

```bash
docker-compose up --build
```

### 3. Seed Database with Realistic Data

In a separate terminal window, execute the automated seeder:

```bash
docker-compose run --rm seed
```

This seeds:
- **50 Synthetic Learners** (Indian competitive exam student personas)
- **3 Competitive Exam Tracks** (JEE Main, NEET UG, UPSC CSE)
- **11 Subject Disciplines** (Physics, Chemistry, Mathematics, Botany, Zoology, Human Physiology, Physical Chemistry, Indian Polity, Modern Indian History, Economics, Geography)
- **30 Syllabus Chapters** distributed across subjects
- **500 High-Quality Multiple-Choice Questions** with realistic distractor options
- **~50 Completed Quiz Sessions & ~750 Historical Question Attempts** with realistic response times and fatigue distributions for instant analytics

---

## 🌐 Service Endpoints

| Service | URL | Description |
|---|---|---|
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | Interactive chat quiz & analytics dashboard |
| **Backend API Root** | [http://localhost:8000](http://localhost:8000) | Health check & API root |
| **Swagger Interactive Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive OpenAPI documentation |
| **ReDoc Alternative Docs** | [http://localhost:8000/redoc](http://localhost:8000/redoc) | Clean OpenAPI documentation |
| **MongoDB Instance** | `localhost:27017` | Native MongoDB connection endpoint |

---

## 💻 Local Development Setup (Without Docker)

### Prerequisites
- Python 3.12+ (managed via [uv](https://docs.astral.sh/uv/) recommended)
- Node.js 20+ & npm
- MongoDB running locally or a [MongoDB Atlas](https://cloud.mongodb.com) free cluster

### Backend Setup

```bash
cd server

# Using uv (recommended)
uv venv
uv pip install --pre -r requirements.txt

# Or using pip
python -m venv .venv
source .venv/bin/activate    # Linux/macOS
.venv\Scripts\activate       # Windows
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set MONGO_URI to your local MongoDB or Atlas connection string

# Run seeder
uv run python -m app.scripts.seed_data        # with uv
python -m app.scripts.seed_data               # with pip

# Start backend server
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload   # with uv
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload          # with pip
```

### Frontend Setup

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

---

## 🚢 Deployment

### Recommended Free-Tier Stack

| Component | Platform | Config |
|---|---|---|
| **Backend** | [Render](https://render.com) | Free Web Service — see [`render.yaml`](render.yaml) |
| **Frontend** | [Vercel](https://vercel.com) | Free Static Hosting — see [`vercel.json`](client/vercel.json) |
| **Database** | [MongoDB Atlas](https://cloud.mongodb.com) | Free M0 Cluster (512 MB) |

### Backend on Render

1. Connect your GitHub repo on [Render](https://render.com)
2. Set **Root Directory** to `server`
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables: `MONGO_URI`, `MONGO_DB_NAME`, `JWT_SECRET`, `JWT_EXPIRE_MINUTES`, `FRONTEND_ORIGIN`

### Frontend on Vercel

1. Import your repo on [Vercel](https://vercel.com)
2. Set **Root Directory** to `client`
3. Framework Preset: **Vite**
4. Add environment variable: `VITE_API_URL` = your Render backend URL

> **Note**: Render's free tier spins down after 15 minutes of inactivity; cold starts take ~30–50 seconds.

---

## 📡 API Overview & Swagger Docs

Interactive OpenAPI documentation is live at `http://localhost:8000/docs`.

### 1. Authentication & Users
- `GET /api/users` — Returns list of seeded user profiles for contact-list login.
- `POST /api/auth/login` — Issues a JWT token given `{ user_id }`.
- `GET /api/auth/me` — Returns profile of current authenticated user (requires Bearer JWT).

### 2. Curriculum Navigation
- `GET /api/exams` — List all examination tracks.
- `GET /api/exams/{exam_id}/subjects` — List subjects under an exam track.
- `GET /api/subjects/{subject_id}/chapters` — List syllabus topics under a subject.

### 3. Adaptive Quiz Engine
- `POST /api/quizzes` — Starts a 15-question quiz session for a given `{ chapter_id }`. Samples questions using MongoDB `$sample`.
- `GET /api/quizzes/{quiz_id}/current-question` — Fetches current question without `correct_option`, stamps `question_shown_at`, and includes `previous_attempts` for chat restoration on refresh.
- `POST /api/quizzes/{quiz_id}/submit` — Submits `{ question_id, selected_option }`, computes response duration, writes to `question_attempts`, increments quiz state, and returns immediate feedback with the next question.
- `POST /api/quizzes/{quiz_id}/abandon` — Explicitly terminates an in-progress quiz session early, preventing future resumption.
- `GET /api/quizzes/{quiz_id}/result` — Returns final score, accuracy %, total elapsed duration, curriculum names, and question-by-question attempt breakdown.

### 4. Analytical Intelligence
- `GET /api/analytics/learning-velocity` — Computes global Learning Velocity Index leaderboard with `$setWindowFields`.
- `GET /api/analytics/fatigue` — Computes accuracy drop-off and pacing across question buckets (supports `?user_id=` and `?quiz_id=`).
- `GET /api/analytics/question-difficulty` — Computes Question Difficulty Index ranking.
- *Shared curriculum filters*: All analytics endpoints support `?exam_id=`, `?subject_id=`, and `?chapter_id=`.

---

## 🗄️ Database Schema & Design Decisions

### Reference vs. Embed Architecture Rationale

```
+----------------+       +------------------+       +-----------------+
|     Exams      | <----|     Subjects     | <----|    Chapters     |
+----------------+       +------------------+       +-----------------+
                                                             |
                                                             v
+----------------+       +------------------+       +-----------------+
|     Users      |       |     Quizzes      |       |    Questions    |
+----------------+       +------------------+       |  [Embedded 4x   |
        |                  (Session State)          |     Options]    |
        |                         |                 +-----------------+
        \                         |                         /
         \                        |                        /
          +-----------------------v-----------------------+
          |               question_attempts               |
          |       (Flat, Append-Only Immutable Log)       |
          +-----------------------------------------------+
```

1. **Why `question_attempts` is an independent, flat collection (NOT embedded in `quizzes` or `users`)**:
   - **BSON 16MB Limit & Array Growth**: Embedding hundreds of attempts inside user or quiz documents causes unbounded document growth, fragmentation, and memory reallocations.
   - **High Write Throughput**: Appending a new attempt document is an $O(1)$ isolated write without document-level write locking on large parent objects.
   - **Aggregation Pipeline Efficiency**: Running analytical aggregation pipelines directly on a flat collection avoids expensive `$unwind` stages, reducing CPU and memory overhead during multi-stage analytics.
   - **Compound Indexing**: Enables targeted compound indexes that allow index-covered queries.

2. **Why Options are Embedded in `questions`**:
   - Options are strictly bounded (always 4 per question).
   - They are always read atomically with the question text and never updated independently.

3. **Why Curriculum is Normalized (`exams` $\rightarrow$ `subjects` $\rightarrow$ `chapters`)**:
   - Supports intuitive three-level hierarchical drill-down and curriculum filtering without redundant text replication.

### The 7 Collections & Index Specifications

| Collection | Schema Description | Indexes |
|---|---|---|
| `users` | `name`, `created_at` | `_id` |
| `exams` | `name`, `description` | `_id`, `name` (unique) |
| `subjects` | `exam_id`, `name` | `_id`, `exam_id` |
| `chapters` | `exam_id`, `subject_id`, `name` | `_id`, `exam_id`, `subject_id` |
| `questions` | `exam_id`, `subject_id`, `chapter_id`, `text`, `options: [key, text]`, `correct_option`, `created_at` | `_id`, `chapter_id` |
| `quizzes` | `user_id`, `chapter_id`, `exam_id`, `subject_id`, `question_ids`, `current_index`, `score`, `status` (`in_progress` / `completed` / `abandoned`), `current_question_shown_at`, `started_at`, `completed_at` | `_id`, `user_id + status` |
| `question_attempts` | **All 12 Fields**: `user_id`, `quiz_id`, `question_id`, `exam_id`, `subject_id`, `chapter_id`, `question_index_in_quiz`, `question_shown_at`, `answer_submitted_at`, `response_duration_ms`, `selected_option`, `is_correct` | `user_id`, `question_id`, `quiz_id + question_index_in_quiz`, `user_id + quiz_id` |

---

## 📊 Analytics Pipelines & Mathematical Assumptions

### 1. Learning Velocity Index (LVI)

Learning Velocity quantifies a learner's mastery speed and consistency across quizzes.

$$\text{LVI} = 0.5 \cdot \text{Norm}(\text{Accuracy}) + 0.3 \cdot \text{Norm}(\text{Inverted Avg Duration}) + 0.2 \cdot \text{Norm}(\text{Consistency})$$

#### Consistency Score Formula:
To ensure scale-independence across varied question lengths, consistency is derived from the Coefficient of Variation ($CV = \frac{\sigma}{\mu}$):

$$\text{Consistency} = \frac{1}{1 + CV} = \frac{1}{1 + \frac{\sigma_{\text{duration}}}{\mu_{\text{duration}}}}$$

*Where:*
- $\sigma_{\text{duration}}$ is the population standard deviation (`$stdDevPop`) of response times.
- $\mu_{\text{duration}}$ is the average response duration (`$avg`).
- A learner with perfectly uniform pacing scores $1.0$, while erratic pacing degrades toward $0.0$.

#### Pipeline Stages in [`analytics_repository.py`](server/app/repositories/analytics_repository.py):
1. **`$match`**: Optional pre-filter on `exam_id`, `subject_id`, `chapter_id`.
2. **`$group`**: Aggregate per `user_id` → `total_attempts`, `correct_count`, `avg_time`, `std_dev_time`.
3. **`$project`**: Compute raw accuracy and CV consistency score.
4. **`$setWindowFields`**: Compute global minimums and maximums across all learners without leaving the aggregation pipeline.
5. **`$project`**: Min-max normalize accuracy, speed ($1 - \text{norm\_time}$ since faster is better), and consistency into the $0.5 / 0.3 / 0.2$ weighted composite index.
6. **`$lookup` & `$sort`**: Join `users` for name display and sort descending by `learning_velocity_index`.

---

### 2. Fatigue Analysis

Quantifies cognitive stamina drop-off and mental pacing degradation as a learner advances through consecutive question indices.

#### Pipeline Stages:
1. **`$match`**: Optional filter on `user_id`, `quiz_id`, or curriculum track.
2. **`$bucket`**: Partitions `question_index_in_quiz` into non-overlapping sequential boundaries `[0, 5, 10, 15, ...]`. Boundaries are dynamically computed based on the maximum question index present.
3. **`$project`**: Computes average accuracy (`$avg: "$is_correct"`) and average response time (`$avg: "$response_duration_ms"`) per bucket.
4. **Output format**: Formatted bucket ranges (e.g. `"1-5"`, `"6-10"`, `"11-15"`).

---

### 3. Question Difficulty Index (QDI)

Identifies curriculum problems that present high cognitive friction across all attempts.

$$\text{QDI} = 0.6 \cdot (1 - \text{Norm}(\text{Accuracy})) + 0.4 \cdot \text{Norm}(\text{Avg Duration})$$

- Questions with low accuracy and high response latency receive higher difficulty scores.
- Utilizes `$setWindowFields` for global dataset normalization and joins the syllabus chapter name for display.

---

## 🧪 Automated Testing Suite

The project includes an automated test suite verifying both the mathematical correctness of aggregation formulas and end-to-end user journeys:

### Running Tests

```bash
# Backend pytest suite (from project root)
cd server
uv run pytest -v tests/

# Frontend type check & build
cd client
npm run type-check
npm run build
```

### Test Coverage Highlights:
- **Mathematical Correctness ([`test_analytics.py`](server/tests/test_analytics.py))**: Hand-calculated assertion suite verifying population stdDev, coefficient-of-variation consistency, min-max normalization, LVI weights, and QDI scoring against deterministic test records.
- **Full E2E Lifecycle Flow ([`test_e2e_flow.py`](server/tests/test_e2e_flow.py))**: Simulates complete journey: List Users → Login JWT → Browse Exam/Subject/Chapter → Create Quiz → 15 Sequential Question Submissions → Verify Attempt Documents → Verify Result Summary. Uses in-memory async MongoDB mocks.

---

## 📝 Assumptions & Known Limitations

1. **Fixed Quiz Length**: Every generated quiz currently samples exactly 15 questions per chapter.
2. **Strict Irreversibility**: Consistent with competitive exam test-taking patterns and server-side duration logging, learners cannot return to previous questions or modify past answers.
3. **Inactivity Timeout**: Quiz sessions are automatically abandoned after 10 minutes of inactivity.
4. **Consistency Scope**: Consistency of response time is evaluated across a user's aggregate attempt history for statistical stability (since single-quiz sample sizes of 15 questions have higher variance).
5. **JWT Authentication**: Built as a zero-friction demo auth flow (user selects from 50 seeded candidate profiles without passwords). In a multi-tenant production environment, this would be replaced with OAuth2/OIDC or Argon2 password hashing.
6. **Analytics Pagination**: Analytics leaderboards return all active ranked learners and questions. For datasets exceeding 10,000 active users, cursor-based pagination and pre-aggregated materialized views (`$merge`) would be introduced.
7. **Render Cold Start**: On Render's free tier, the backend spins down after 15 minutes of inactivity and takes ~30–50 seconds to cold-start on the next request.

---

## 📄 License

MIT License. Designed and engineered for high-velocity learning intelligence.
