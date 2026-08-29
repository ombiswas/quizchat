"""
Async MongoDB client and FastAPI dependency.

Why a module-level client (not per-request)?
Motor's AsyncIOMotorClient manages an internal connection pool. Creating a new
client on every request would open a new TCP connection each time, destroying
both performance and the pool's purpose. Instead we create one client at
application startup (via the FastAPI lifespan), store it on the app's state,
and reuse it for every request.
"""

import certifi
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from fastapi import Request

from app.core.config import settings


def get_motor_client() -> AsyncIOMotorClient:
    """
    Create and return a Motor async client configured from settings.

    Automatically attaches certifi's Mozilla CA bundle when connecting to
    MongoDB Atlas (mongodb+srv://) or any TLS/SSL enabled cluster to prevent
    TLSV1_ALERT_INTERNAL_ERROR handshakes on modern Python runtimes.
    """
    kwargs = {}
    uri_lower = settings.mongo_uri.lower()
    if "mongodb+srv://" in uri_lower or "ssl=true" in uri_lower or "tls=true" in uri_lower:
        kwargs["tlsCAFile"] = certifi.where()

    return AsyncIOMotorClient(settings.mongo_uri, **kwargs)


def get_database(request: Request) -> AsyncIOMotorDatabase:
    """
    FastAPI dependency that returns the application's Motor database handle.
    """
    return request.app.state.db
