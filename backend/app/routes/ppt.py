from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from app.models.schemas import PPTRequest, APIResponse
from app.services.ppt_service import generate_ppt_file
import os
from app.utils.database import log_generation
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/ppt", tags=["ppt"])

@router.post("/generate")
async def generate_ppt(request: PPTRequest, user: dict = Depends(get_current_user)):
    try:
        user_id = user["sub"]
        token = user.get("access_token")
        filepath = await generate_ppt_file(request.prompt, request.num_slides, user_id=user_id)
        filename = os.path.basename(filepath)
        log_generation(user_id, "ppt", {"prompt": request.prompt, "slides": request.num_slides}, title="Generated PPT Presentation", prompt=request.prompt[:200], access_token=token)
        return APIResponse(success=True, data={"url": f"/api/ppt/download/{filename}"}, message="PPT generated successfully")
    except Exception as e:
        return APIResponse(success=False, message=str(e))

@router.get("/download/{filename}")
async def download_ppt(filename: str):
    filepath = os.path.join("output", filename)
    if os.path.exists(filepath):
        return FileResponse(filepath, filename=filename, media_type='application/vnd.openxmlformats-officedocument.presentationml.presentation')
    return APIResponse(success=False, message="File not found")
