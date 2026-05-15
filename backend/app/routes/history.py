from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import APIResponse
from app.utils.database import get_supabase
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/history", tags=["history"])

@router.get("/{feature}", response_model=APIResponse)
async def get_feature_history(feature: str, user: dict = Depends(get_current_user)):
    """
    Returns the history of a specific feature for the fully authenticated user.
    Supported features: 'notes', 'youtube', 'ppt', 'flashcards', 'code_explainer'
    """
    client = get_supabase(access_token=user.get("access_token"))
    if not client:
        return APIResponse(success=False, message="Database connectivity error")

    user_id = user["sub"]
    try:
        if feature in ["notes", "youtube", "ppt"]:
            # These are stored together in content_generations where youtube=videos
            # Let's map frontend names to backend DB conventions
            db_content_type = feature
            if feature == "youtube":
                db_content_type = "videos"
                
            response = client.table("content_generations") \
                             .select("*") \
                             .eq("user_id", user_id) \
                             .eq("content_type", db_content_type) \
                             .order("created_at", desc=True) \
                             .limit(20) \
                             .execute()
            return APIResponse(success=True, data=response.data)
            
        elif feature == "flashcards":
            response = client.table("flashcards") \
                             .select("*") \
                             .eq("user_id", user_id) \
                             .order("created_at", desc=True) \
                             .limit(20) \
                             .execute()
            return APIResponse(success=True, data=response.data)
            
        elif feature == "code_explainer":
            response = client.table("code_explanations") \
                             .select("*") \
                             .eq("user_id", user_id) \
                             .order("created_at", desc=True) \
                             .limit(20) \
                             .execute()
            return APIResponse(success=True, data=response.data)
        
        elif feature == "workflow":
            response = client.table("content_generations") \
                             .select("*") \
                             .eq("user_id", user_id) \
                             .eq("content_type", "workflow") \
                             .order("created_at", desc=True) \
                             .limit(20) \
                             .execute()
            return APIResponse(success=True, data=response.data)
        
        else:
            return APIResponse(success=False, message="Invalid feature specified")
            
    except Exception as e:
        return APIResponse(success=False, message=f"Failed to fetch history: {str(e)}")
