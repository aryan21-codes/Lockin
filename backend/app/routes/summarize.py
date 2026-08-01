from fastapi import APIRouter, UploadFile, File, Depends
from app.models.schemas import SummarizeRequest, APIResponse
from app.services.summarizer import generate_smart_notes
from app.utils.pdf_parser import extract_text_from_pdf
from app.utils.database import log_generation
from app.dependencies.auth import (
    get_current_identity, require_guest_quota,
    AuthenticatedUser, GuestUser,
)

router = APIRouter(prefix="/api/summarize", tags=["summarize"])


def _build_response(ai_data, identity):
    """Build response with guest_usage metadata if applicable."""
    response_data = ai_data
    if isinstance(identity, GuestUser):
        return APIResponse(
            success=True,
            data=response_data,
            message=None,
        ).model_dump() | {
            "guest_usage": identity.payload.get("_guest_usage", {}),
            "guest_remaining": identity.payload.get("_guest_remaining", 0),
        }
    return APIResponse(success=True, data=response_data)


@router.post("/", response_model=None)
async def summarize_text(
    request: SummarizeRequest,
    identity=Depends(require_guest_quota("summarizer")),
):
    try:
        if isinstance(identity, AuthenticatedUser):
            user_id = identity.user_id
            token = identity.access_token
            ai_data = await generate_smart_notes(request.text, user_id=user_id)
            log_generation(user_id, "smart_notes", {"type": "text"}, title="Smart Notes Generated", prompt=request.text[:200], access_token=token)
            return APIResponse(success=True, data=ai_data)
        else:
            # Guest: generate but skip persistence
            ai_data = await generate_smart_notes(request.text, user_id="guest")
            return _build_response(ai_data, identity)
    except Exception as e:
        return APIResponse(success=False, message=str(e))


@router.post("/upload", response_model=None)
async def summarize_pdf(
    file: UploadFile = File(...),
    identity=Depends(require_guest_quota("summarizer")),
):
    if not file.filename.lower().endswith('.pdf'):
        return APIResponse(success=False, message="Please upload a valid PDF file.")
    try:
        content = await file.read()
        extracted_text = extract_text_from_pdf(content)

        if isinstance(identity, AuthenticatedUser):
            user_id = identity.user_id
            token = identity.access_token
            ai_data = await generate_smart_notes(extracted_text, user_id=user_id)
            log_generation(user_id, "smart_notes", {"type": "pdf", "filename": file.filename}, title=f"Smart Notes: {file.filename}", prompt=extracted_text[:200], access_token=token)
            return APIResponse(success=True, data=ai_data)
        else:
            # Guest: generate but skip persistence
            ai_data = await generate_smart_notes(extracted_text, user_id="guest")
            return _build_response(ai_data, identity)
    except Exception as e:
        return APIResponse(success=False, message=str(e))
