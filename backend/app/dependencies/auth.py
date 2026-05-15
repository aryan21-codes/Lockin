import requests
from jose import jwt, JWTError, ExpiredSignatureError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.config import settings

security = HTTPBearer()

# Cache JWKS keys so we don't fetch on every request
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
        print(f"[AUTH]: JWKS fetched successfully. Keys: {[k.get('kid') for k in _JWKS_CACHE.get('keys', [])]}")
        return _JWKS_CACHE
    except Exception as e:
        print(f"[JWKS FETCH ERROR]: {e}")
        return None


def decode_token(token: str) -> dict:
    """
    Decode a Supabase JWT.
    - Modern Supabase projects use RS256 (asymmetric) → verified via JWKS public keys
    - Legacy Supabase projects use HS256 (symmetric) → verified via SUPABASE_JWT_SECRET
    python-jose handles both automatically given the correct key.
    """
    # Peek at the token header to determine the algorithm without verifying
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "RS256")
        kid = header.get("kid")
    except Exception as e:
        raise JWTError(f"Malformed token header: {e}")

    print(f"[AUTH]: Token alg={alg}, kid={kid}")

    # --- RS256 / asymmetric path ---
    if alg in ("RS256", "ES256"):
        jwks = get_jwks()
        if not jwks:
            raise JWTError("Could not fetch JWKS to verify token")

        keys = jwks.get("keys", [])
        # Find the matching key by kid if present
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
                continue  # Try next key

        raise JWTError("Signature verification failed with all available JWKS keys")

    # --- HS256 / symmetric path ---
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


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    FastAPI dependency that validates the Supabase Bearer token
    and returns the decoded payload (including `sub` = user UUID).
    """
    token = credentials.credentials
    try:
        payload = decode_token(token)
        if not payload.get("sub"):
            raise JWTError("Token missing 'sub' claim")
        # Include raw token so routes can pass it to Supabase for RLS
        payload["access_token"] = token
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        print(f"[AUTH ERROR]: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        print(f"[AUTH UNEXPECTED ERROR]: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication system error",
        )
