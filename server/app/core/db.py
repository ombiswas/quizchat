"""
Async MongoDB client and FastAPI dependency.

Why a module-level client (not per-request)?
Motor's AsyncIOMotorClient manages an internal connection pool.  Creating a new
client on every request would open a new TCP connection each time, destroying
both performance and the pool's purpose.  Instead we create one client at
application startup (via the FastAPI lifespan), store it on the app's state,
and reuse it for every request.

Why expose get_database() as a FastAPI dependency (Depends)?
Using Depends makes the database injectable, which means:
  1. Routes and services that need the DB declare it explicitly in their
     signature — the dependency is visible, not hidden in a global.
  2. Tests can override the dependency to point at a test database without
     patching globals.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from fastapi import Request

from app.core.config import settings


def get_motor_client() -> AsyncIOMotorClient:
    """
    Create and return a Motor async client configured from settings.

    This is called once at application startup (in the lifespan context
    manager in main.py).  The returned client is stored on app.state so
    it can be retrieved by get_database().
    """
    return AsyncIOMotorClient(settings.mongo_uri)


def get_database(request: Request) -> AsyncIOMotorDatabase:
    """
    FastAPI dependency that returns the application's Motor database handle.

    Usage in a router:
        from fastapi import Depends
        from app.core.db import get_database

        @router.get("/example")
        async def example(db: AsyncIOMotorDatabase = Depends(get_database)):
            ...

    The database handle is retrieved from app.state, which is populated
    during the lifespan startup in main.py.  Repositories receive this
    handle as a constructor argument rather than importing it as a global —
    that keeps them testable and free of import-time side-effects.
    """
    return request.app.state.db
