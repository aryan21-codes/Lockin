from fastapi import APIRouter, Depends, HTTPException, Query
from app.models.schemas import APIResponse
from app.utils.database import get_supabase
from app.dependencies.auth import get_current_user
import logging

logger = logging.getLogger("lockin.history")

router = APIRouter(prefix="/api/history", tags=["history"])

@router.get("/{feature}", response_model=APIResponse)
async def get_feature_history(
    feature: str,
    limit: int = Query(default=10, ge=1, le=50, description="Number of records to return"),
    offset: int = Query(default=0, ge=0, description="Number of records to skip"),
    user: dict = Depends(get_current_user)
):
    """
    Returns paginated history of a specific feature for the authenticated user.
    Supported features: 'notes', 'youtube', 'ppt', 'flashcards', 'code_explainer', 'workflow'
    
    Optimizations:
    - Pagination via limit/offset (default: 10 per page)
    - Column-specific selects instead of select("*")
    - Ordered by created_at desc for most-recent-first
    """
    client = get_supabase(access_token=user.get("access_token"))
    if not client:
        return APIResponse(success=False, message="Database connectivity error")

    user_id = user["sub"]
    try:
        if feature in ["notes", "youtube", "ppt"]:
            # Map frontend names to backend DB conventions
            db_content_type = feature
            if feature == "youtube":
                db_content_type = "videos"
                
            response = client.table("content_generations") \
                             .select("id, content_type, content, created_at") \
                             .eq("user_id", user_id) \
                             .eq("content_type", db_content_type) \
                             .order("created_at", desc=True) \
                             .range(offset, offset + limit - 1) \
                             .execute()
            return APIResponse(success=True, data=response.data)
            
        elif feature == "flashcards":
            response = client.table("flashcards") \
                             .select("id, question, answer, difficulty, created_at") \
                             .eq("user_id", user_id) \
                             .order("created_at", desc=True) \
                             .range(offset, offset + limit - 1) \
                             .execute()
            return APIResponse(success=True, data=response.data)
            
        elif feature == "code_explainer":
            response = client.table("code_explanations") \
                             .select("id, code, explanation, created_at") \
                             .eq("user_id", user_id) \
                             .order("created_at", desc=True) \
                             .range(offset, offset + limit - 1) \
                             .execute()
            return APIResponse(success=True, data=response.data)
        
        elif feature == "workflow":
            response = client.table("content_generations") \
                             .select("id, content_type, content, created_at") \
                             .eq("user_id", user_id) \
                             .eq("content_type", "workflow") \
                             .order("created_at", desc=True) \
                             .range(offset, offset + limit - 1) \
                             .execute()
            return APIResponse(success=True, data=response.data)
        
        else:
            return APIResponse(success=False, message="Invalid feature specified")
            
    except Exception as e:
        logger.error(f"Failed to fetch {feature} history: {e}")
        return APIResponse(success=False, message=f"Failed to fetch history: {str(e)}")
