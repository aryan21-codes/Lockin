from fastapi import APIRouter, Depends
from app.models.schemas import APIResponse
from app.utils.database import get_dashboard_stats, get_recent_activity
from app.dependencies.auth import get_current_user
from cachetools import TTLCache
import logging

logger = logging.getLogger("lockin.dashboard")

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# ─── Per-user TTL cache for dashboard data ─────────────────────
# Avoids re-running 5+ DB queries when the user refreshes the
# dashboard within 60 seconds. Max 200 users cached simultaneously.
_dashboard_cache = TTLCache(maxsize=200, ttl=60)

@router.get("/combined", response_model=APIResponse)
async def fetch_dashboard_combined(user: dict = Depends(get_current_user)):
    """
    Combined endpoint: returns both stats and recent activity in
    a single API call. Cached per-user for 60 seconds.
    """
    user_id = user["sub"]
    cache_key = f"dash_{user_id}"
    
    # Return cached result if available
    if cache_key in _dashboard_cache:
        logger.info(f"Dashboard cache HIT for user {user_id[:8]}...")
        return APIResponse(success=True, data=_dashboard_cache[cache_key])
    
    logger.info(f"Dashboard cache MISS for user {user_id[:8]}... — fetching from DB")
    access_token = user.get("access_token")
    stats = get_dashboard_stats(user_id, access_token=access_token)
    activity = get_recent_activity(user_id, access_token=access_token)
    
    result = {"stats": stats, "activity": activity}
    _dashboard_cache[cache_key] = result
    
    return APIResponse(success=True, data=result)

# ─── Legacy endpoints (kept for backward compatibility) ────────
@router.get("/stats", response_model=APIResponse)
async def fetch_dashboard_stats(user: dict = Depends(get_current_user)):
    stats = get_dashboard_stats(user["sub"], access_token=user.get("access_token"))
    return APIResponse(success=True, data=stats)

@router.get("/activity", response_model=APIResponse)
async def fetch_recent_activity(user: dict = Depends(get_current_user)):
    activity = get_recent_activity(user["sub"], access_token=user.get("access_token"))
    return APIResponse(success=True, data=activity)
