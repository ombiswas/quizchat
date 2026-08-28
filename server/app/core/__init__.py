"""
Core infrastructure package: config, database, auth, logging.

Nothing in this package should contain business logic.  It is the plumbing
that every other layer depends on.
"""

from app.core.config import settings
from app.core.db import get_database, get_motor_client
from app.core.indexes import create_indexes
from app.core.security import (
    create_access_token,
    decode_access_token,
    get_current_user,
)

__all__ = [
    "settings",
    "get_motor_client",
    "get_database",
    "create_indexes",
    "create_access_token",
    "decode_access_token",
    "get_current_user",
]
