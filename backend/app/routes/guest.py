"""
Guest authentication endpoint.
Issues short-lived signed JWTs for unauthenticated visitors
so they can try the 4 AI demo features without creating an account.
"""

import uuid
import logging
from datetime import datetime, timedelta, timezone

import jwt as pyjwt
from fastapi import APIRouter, Request
from app.utils.config import settings

logger = logging.getLogger("lockin.guest")

router = APIRouter(prefix="/api/auth", tags=["guest"])

GUEST_TOKEN_EXPIRY_HOURS = 24
GUEST_FEATURES = ["summarizer", "flashcards", "code_explainer", "ppt_generator"]
GUEST_PER_FEATURE_LIMIT = 3


@router.post("/guest")
async def issue_guest_token(request: Request):
    """
    Generate a guest identity token.
    No PII collected. No Supabase account created.
    Returns a signed JWT + initial usage/limits metadata.
    """
    guest_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=GUEST_TOKEN_EXPIRY_HOURS)

    payload = {
        "type": "guest",
        "guest_id": guest_id,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }

    token = pyjwt.encode(payload, settings.GUEST_JWT_SECRET, algorithm="HS256")

    logger.info(f"Issued guest token for guest_id={guest_id[:8]}...")

    return {
        "guest_token": token,
        "guest_id": guest_id,
        "expires_at": expires_at.isoformat(),
        "usage": {f: 0 for f in GUEST_FEATURES},
        "limits": {f: GUEST_PER_FEATURE_LIMIT for f in GUEST_FEATURES},
    }
