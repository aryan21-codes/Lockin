from fastapi import APIRouter, Depends
from app.models.schemas import APIResponse
from app.utils.database import get_dashboard_stats, get_recent_activity
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats", response_model=APIResponse)
async def fetch_dashboard_stats(user: dict = Depends(get_current_user)):
    stats = get_dashboard_stats(user["sub"], access_token=user.get("access_token"))
    return APIResponse(success=True, data=stats)

@router.get("/activity", response_model=APIResponse)
async def fetch_recent_activity(user: dict = Depends(get_current_user)):
    activity = get_recent_activity(user["sub"], access_token=user.get("access_token"))
    return APIResponse(success=True, data=activity)
