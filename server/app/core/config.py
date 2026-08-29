"""
Application configuration via pydantic-settings.

All environment-variable-backed settings are declared here in one place.
No other module should read os.environ directly; import `settings` from
this module instead.

The Settings class uses pydantic-settings' BaseSettings which automatically:
  - reads values from environment variables (case-insensitive)
  - reads values from a .env file if present (via env_file below)
  - validates types and raises a clear error on startup if a required
    variable is missing or has the wrong type

This "fail-fast at startup" behaviour is intentional: a misconfigured app
that won't boot is far easier to debug than one that boots and fails later.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """
    Central settings object.  All fields are populated from environment
    variables (or from .env).  Fields with no default are required — the
    application will refuse to start if they are absent.
    """

    # ── MongoDB ───────────────────────────────────────────────────────────────
    mongo_uri: str = Field(
        description="Full MongoDB connection URI, e.g. mongodb://localhost:27017"
    )
    mongo_db_name: str = Field(
        default="quizchat",
        description="Name of the MongoDB database to use.",
    )

    # ── Auth ──────────────────────────────────────────────────────────────────
    jwt_secret: str = Field(
        description="Secret key used to sign JWT tokens.  Must be kept private."
    )
    jwt_expire_minutes: int = Field(
        default=1440,  # 24 hours
        description="JWT token lifetime in minutes.",
    )
    jwt_algorithm: str = Field(
        default="HS256",
        description="Algorithm used to sign JWTs.",
    )

    # ── CORS ──────────────────────────────────────────────────────────────────
    frontend_origin: str = Field(
        default="http://localhost:5173",
        description="Origin the backend will accept CORS requests from.",
    )

    # ── Seed configuration ────────────────────────────────────────────────────
    # These are read by seed_data.py so the dataset size is configurable without
    # touching code.
    seed_num_users: int = Field(default=50)
    seed_num_exams: int = Field(default=3)
    seed_num_subjects: int = Field(default=10)
    seed_num_chapters: int = Field(default=30)
    seed_num_questions: int = Field(default=500)
    seed_questions_per_quiz: int = Field(default=15)

    @property
    def cors_origins(self) -> list[str]:
        """
        Parse frontend_origin into a list of origins (supports comma-separated production origins).
        """
        origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ]
        if self.frontend_origin:
            for o in self.frontend_origin.split(","):
                clean = o.strip()
                if clean and clean not in origins:
                    origins.append(clean)
        return origins

    model_config = SettingsConfigDict(
        env_file=(".env", "server/.env", "../server/.env"),
        env_file_encoding="utf-8",
        # Allow extra fields in .env without raising an error (useful when the
        # .env also contains VITE_* variables intended for the frontend).
        extra="ignore",
        case_sensitive=False,
    )


# Module-level singleton — import this everywhere instead of instantiating
# Settings() multiple times.
settings = Settings()
