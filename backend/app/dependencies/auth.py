"""
Authentication & Identity dependencies for Lockin.

Supports two identity types:
  - AuthenticatedUser: validated via Supabase RS256/HS256 JWT (existing flow)
  - GuestUser: validated via HS256 guest JWT signed with GUEST_JWT_SECRET

The original `get_current_user` dependency is UNCHANGED — routes using it
will naturally reject guest tokens (different signing key) with 401.

New dependencies:
  - `get_current_identity`: accepts either token type, returns discriminated union
  - `require_guest_quota(feature)`: checks + increments guest usage counters
"""

import hashlib
import logging
from dataclasses import dataclass
from typing import Union

import jwt as pyjwt
import requests
from jose import jwt, JWTError, ExpiredSignatureError
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.config import settings

logger = logging.getLogger("lockin.auth")

security = HTTPBearer()
# Allow optional Bearer token (for endpoints that accept both authed and guest)
security_optional = HTTPBearer(auto_error=False)

# ─── Identity Types ────────────────────────────────────────────

@dataclass
class AuthenticatedUser:
    identity_type: str = "authenticated"
    user_id: str = ""
    access_token: str = ""
    payload: dict = None

    def __post_init__(self):
        if self.payload is None:
            self.payload = {}


@dataclass
class GuestUser:
    identity_type: str = "guest"
    guest_id: str = ""
    payload: dict = None

    def __post_init__(self):
        if self.payload is None:
            self.payload = {}


# ─── JWKS Cache (Supabase RS256) ──────────────────────────────

_JWKS_CACHE = None

def get_jwks():
    global _JWKS_CACHE
    if _JWKS_CACHE:
        return _JWKS_CACHE
    jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    try:
        resp = requests.get(jwks_url, timeout=10)
        resp.raise_for_status()
        _JWKS_CACHE = resp.json()
        logger.info(f"JWKS fetched. Keys: {[k.get('kid') for k in _JWKS_CACHE.get('keys', [])]}")
        return _JWKS_CACHE
    except Exception as e:
        logger.error(f"JWKS fetch error: {e}")
        return None


# ─── Supabase Token Decoder (unchanged logic) ─────────────────

def decode_token(token: str) -> dict:
    """
    Decode a Supabase JWT.
    - RS256 (asymmetric) → verified via JWKS public keys
    - HS256 (symmetric) → verified via SUPABASE_JWT_SECRET
    """
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "RS256")
        kid = header.get("kid")
    except Exception as e:
        raise JWTError(f"Malformed token header: {e}")

    logger.debug(f"Token alg={alg}, kid={kid}")

    # --- RS256 / asymmetric path ---
    if alg in ("RS256", "ES256"):
        jwks = get_jwks()
        if not jwks:
            raise JWTError("Could not fetch JWKS to verify token")

        keys = jwks.get("keys", [])
        matching_keys = [k for k in keys if not kid or k.get("kid") == kid] or keys

        for key in matching_keys:
            try:
                payload = jwt.decode(
                    token,
                    key,
                    algorithms=[alg],
                    options={"verify_aud": False}
                )
                return payload
            except ExpiredSignatureError:
                raise
            except JWTError:
                continue

        raise JWTError("Signature verification failed with all available JWKS keys")

    # --- HS256 / symmetric path (Supabase legacy) ---
    if alg == "HS256":
        if not settings.SUPABASE_JWT_SECRET:
            raise JWTError("SUPABASE_JWT_SECRET not set for HS256 token")
        clean_secret = settings.SUPABASE_JWT_SECRET.strip('"').strip("'")
        try:
            payload = jwt.decode(
                token,
                clean_secret,
                algorithms=["HS256"],
                options={"verify_aud": False}
            )
            return payload
        except ExpiredSignatureError:
            raise
        except JWTError as e:
            raise JWTError(f"HS256 verification failed: {e}")

    raise JWTError(f"Unsupported algorithm: {alg}")


# ─── Guest Token Decoder ──────────────────────────────────────

def decode_guest_token(token: str) -> dict:
    """
    Decode a guest JWT signed with GUEST_JWT_SECRET.
    Expects claims: type="guest", guest_id=<uuid>, exp=<timestamp>.
    """
    try:
        payload = pyjwt.decode(
            token,
            settings.GUEST_JWT_SECRET,
            algorithms=["HS256"],
        )
        if payload.get("type") != "guest":
            raise ValueError("Not a guest token")
        if not payload.get("guest_id"):
            raise ValueError("Missing guest_id claim")
        return payload
    except pyjwt.ExpiredSignatureError:
        raise
    except Exception as e:
        raise ValueError(f"Invalid guest token: {e}")


# ─── Original Dependency (UNCHANGED — auth-only routes) ───────

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    FastAPI dependency that validates the Supabase Bearer token
    and returns the decoded payload (including `sub` = user UUID).
    Guest tokens will naturally fail here since they use a different signing key.
    """
    token = credentials.credentials
    try:
        payload = decode_token(token)
        if not payload.get("sub"):
            raise JWTError("Token missing 'sub' claim")
        payload["access_token"] = token
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        logger.warning(f"Auth error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Unexpected auth error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication system error",
        )


# ─── Dual Identity Dependency (new — accepts both) ────────────

def get_current_identity(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Union[AuthenticatedUser, GuestUser]:
    """
    Accepts either a Supabase JWT or a guest JWT.
    Returns a typed identity object for route handlers to branch on.
    """
    token = credentials.credentials

    # Try guest token first (fast HS256 decode, no network call)
    try:
        guest_payload = decode_guest_token(token)
        return GuestUser(
            guest_id=guest_payload["guest_id"],
            payload=guest_payload,
        )
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Guest session expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (ValueError, Exception):
        pass  # Not a guest token — try Supabase

    # Try Supabase token
    try:
        payload = decode_token(token)
        if not payload.get("sub"):
            raise JWTError("Token missing 'sub' claim")
        payload["access_token"] = token
        return AuthenticatedUser(
            user_id=payload["sub"],
            access_token=token,
            payload=payload,
        )
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        logger.warning(f"Identity validation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─── Guest Quota Enforcement ──────────────────────────────────

GUEST_PER_FEATURE_LIMIT = 3
GUEST_IP_FEATURE_LIMIT = 15  # backstop for shared NAT


def _hash_ip(ip: str) -> str:
    """Salted hash of request IP. No raw IP is stored."""
    salt = "lockin-guest-ip-salt-2024"
    return hashlib.sha256(f"{salt}:{ip}".encode()).hexdigest()[:32]


def require_guest_quota(feature: str):
    """
    Dependency factory: returns a dependency that checks + increments
    guest usage for the given feature. Only applies to GuestUser.
    For AuthenticatedUser, passes through without any checks.
    """

    async def _check_quota(
        request: Request,
        identity: Union[AuthenticatedUser, GuestUser] = Depends(get_current_identity),
    ) -> Union[AuthenticatedUser, GuestUser]:
        # Authenticated users skip quota checks entirely
        if isinstance(identity, AuthenticatedUser):
            return identity

        # Guest: check and increment usage
        from app.utils.database import check_and_increment_guest_usage

        client_ip = request.client.host if request.client else "unknown"
        ip_hash = _hash_ip(client_ip)

        result = check_and_increment_guest_usage(
            guest_id=identity.guest_id,
            ip_hash=ip_hash,
            feature=feature,
            per_guest_limit=GUEST_PER_FEATURE_LIMIT,
            per_ip_limit=GUEST_IP_FEATURE_LIMIT,
        )

        if not result["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "guest_limit_reached",
                    "feature": feature,
                    "remaining": 0,
                    "usage": result.get("usage", {}),
                    "message": f"You've used all {GUEST_PER_FEATURE_LIMIT} free tries for this feature. Sign up to continue!",
                },
            )

        # Attach usage metadata to identity for the route to include in response
        identity.payload["_guest_usage"] = result.get("usage", {})
        identity.payload["_guest_remaining"] = result.get("remaining", 0)

        return identity

    return _check_quota
