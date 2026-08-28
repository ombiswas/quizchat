# QuizChat

> A WhatsApp-style quiz application built with FastAPI, MongoDB, and React.

---

## Overview

*(To be filled in during Phase 6 — after the build is complete.)*

QuizChat lets users select an exam → subject → chapter and play through a quiz
presented as a real-time chat thread. Every answer is recorded as an immutable
event, enabling three analytics pipelines: **Learning Velocity Index**, **Fatigue
Analysis**, and **Question Difficulty Index**.

---

## Quick Start

### Prerequisites
- Docker & Docker Compose v2+
- Node.js 20+ (for local frontend development without Docker)
- Python 3.11+ (for local backend development without Docker)

### 1. Clone & configure

```bash
git clone <repo-url>
cd quizchat

# Backend config (MongoDB, JWT secret, CORS, seed counts)
cp server/.env.example server/.env
# Edit server/.env — at minimum, set JWT_SECRET to a strong random value:
# python -c "import secrets; print(secrets.token_hex(32))"

# Frontend config (API base URL)
cp client/.env.example client/.env
# Edit client/.env if your backend runs on a non-default port/host
```

### 2. Start all services

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
| MongoDB | localhost:27017 |

### 3. Seed the database

```bash
docker-compose run --rm seed
```

This inserts 50 users, 3 exams, 10 subjects, 30 chapters, and 500 questions
with a fixed random seed (reproducible). See `server/app/scripts/seed_data.py`.

---

## Tech Stack

*(Full rationale documented in `docs/techstack.md`.)*

| Layer | Choice |
|---|---|
| Frontend | React (Vite) + TypeScript + Tailwind CSS |
| State / data | TanStack Query + Zustand |
| Charts | Recharts |
| Backend | FastAPI (Python 3.11+) |
| Validation | Pydantic v2 |
| Database | MongoDB (Motor async driver) |
| Auth | Dummy JWT (user picks from list, no password) |
| Dev tooling | Docker Compose |

---

## Project Structure

```
quizchat/
├── server/              # FastAPI application
│   └── app/
│       ├── api/         # Thin routers (parse/return only)
│       ├── schemas/     # Pydantic request/response models
│       ├── services/    # Business logic
│       ├── repositories/# MongoDB queries & aggregation pipelines
│       ├── models/      # MongoDB document shapes
│       ├── core/        # Config, DB connection, auth
│       └── scripts/     # seed_data.py
├── client/              # Vite + React frontend
├── docker-compose.yml
├── .env.example
└── README.md            # (this file)
```

---

## Database Schema

*(To be filled in during Phase 6.)*

---

## Analytics

*(To be filled in during Phase 6.)*

---

## API Overview

Interactive docs available at `http://localhost:8000/docs` once the backend is running.

---

## Known Limitations & Assumptions

*(To be filled in during Phase 6 — see `docs/tracker.md` Assumptions Log.)*
