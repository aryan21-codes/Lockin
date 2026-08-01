from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from app.models.schemas import PPTRequest, APIResponse
from app.services.ppt_service import generate_ppt_file
import os
from app.utils.database import log_generation
from app.dependencies.auth import (
    get_current_identity, require_guest_quota,
    AuthenticatedUser, GuestUser,
)

router = APIRouter(prefix="/api/ppt", tags=["ppt"])


@router.post("/generate", response_model=None)
async def generate_ppt(
    request: PPTRequest,
    identity=Depends(require_guest_quota("ppt_generator")),
):
    try:
        if isinstance(identity, AuthenticatedUser):
            user_id = identity.user_id
            token = identity.access_token
            filepath = await generate_ppt_file(request.prompt, request.num_slides, user_id=user_id)
            filename = os.path.basename(filepath)
            log_generation(user_id, "ppt", {"prompt": request.prompt, "slides": request.num_slides}, title="Generated PPT Presentation", prompt=request.prompt[:200], access_token=token)
            return APIResponse(success=True, data={"url": f"/api/ppt/download/{filename}"}, message="PPT generated successfully")
        else:
            # Guest: generate but skip persistence
            filepath = await generate_ppt_file(request.prompt, request.num_slides, user_id="guest")
            filename = os.path.basename(filepath)
            base_response = APIResponse(
                success=True,
                data={"url": f"/api/ppt/download/{filename}"},
                message="PPT generated successfully",
            ).model_dump()
            base_response["guest_usage"] = identity.payload.get("_guest_usage", {})
            base_response["guest_remaining"] = identity.payload.get("_guest_remaining", 0)
            return base_response
    except Exception as e:
        return APIResponse(success=False, message=str(e))

@router.get("/download/{filename}")
async def download_ppt(filename: str):
    filepath = os.path.join("output", filename)
    if os.path.exists(filepath):
        return FileResponse(filepath, filename=filename, media_type='application/vnd.openxmlformats-officedocument.presentationml.presentation')
    return APIResponse(success=False, message="File not found")
