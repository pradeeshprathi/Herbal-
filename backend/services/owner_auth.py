"""Very small owner authentication.

The owner signs in with a password (OWNER_PASSWORD in .env) and receives a signed,
expiring, HttpOnly cookie. No password or secret is ever stored in the browser or
returned by the API.
"""

from __future__ import annotations

import hashlib
import hmac
import time

from fastapi import HTTPException, Request

from ..config import settings

COOKIE_NAME = "bh_owner"


def _secret() -> bytes:
    # Use SECRET_KEY when provided, otherwise derive one from the password so
    # old sessions are invalidated as soon as the password changes.
    base = settings.secret_key or f"buddy-herbal-owner::{settings.owner_password}"
    return hashlib.sha256(base.encode("utf-8")).digest()


def create_token(hours: int | None = None) -> str:
    lifetime = hours or settings.owner_session_hours
    expiry = int(time.time() + lifetime * 3600)
    signature = hmac.new(_secret(), str(expiry).encode(), hashlib.sha256).hexdigest()
    return f"{expiry}.{signature}"


def verify_token(token: str | None) -> bool:
    if not token or "." not in token:
        return False
    expiry_raw, signature = token.split(".", 1)
    try:
        expiry = int(expiry_raw)
    except ValueError:
        return False
    if expiry < time.time():
        return False
    expected = hmac.new(_secret(), expiry_raw.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(signature, expected)


def check_password(password: str) -> bool:
    return hmac.compare_digest((password or "").encode(), settings.owner_password.encode())


def require_owner(request: Request) -> bool:
    """FastAPI dependency that guards every owner endpoint."""
    if not verify_token(request.cookies.get(COOKIE_NAME)):
        raise HTTPException(
            status_code=401,
            detail="Owner login required",
            headers={"WWW-Authenticate": "Cookie"},
        )
    return True
