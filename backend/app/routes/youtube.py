from fastapi import APIRouter, Depends
from app.models.schemas import YoutubeSummarizeRequest, APIResponse
from app.services.youtube_service import summarize_youtube_video
from app.utils.database import log_generation
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/youtube", tags=["youtube"])

@router.post("/summarize", response_model=APIResponse)
async def summarize_video(request: YoutubeSummarizeRequest, user: dict = Depends(get_current_user)):
    try:
        user_id = user["sub"]
        token = user.get("access_token")
        ai_data = await summarize_youtube_video(request.url)
        log_generation(user_id, "videos", {"url": request.url}, title="Summarized YouTube Video", youtube_url=request.url, access_token=token)
        return APIResponse(success=True, data=ai_data)
    except Exception as e:
        return APIResponse(success=False, message=str(e))
