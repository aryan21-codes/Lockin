from fastapi import APIRouter, UploadFile, File, Depends
from app.models.schemas import SummarizeRequest, APIResponse
from app.services.summarizer import generate_smart_notes
from app.utils.pdf_parser import extract_text_from_pdf
from app.utils.database import log_generation
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/summarize", tags=["summarize"])

@router.post("/", response_model=APIResponse)
async def summarize_text(request: SummarizeRequest, user: dict = Depends(get_current_user)):
    try:
        user_id = user["sub"]
        token = user.get("access_token")
        ai_data = await generate_smart_notes(request.text, user_id=user_id)
        log_generation(user_id, "smart_notes", {"type": "text"}, title="Smart Notes Generated", prompt=request.text[:200], access_token=token)
        return APIResponse(success=True, data=ai_data)
    except Exception as e:
        return APIResponse(success=False, message=str(e))

@router.post("/upload", response_model=APIResponse)
async def summarize_pdf(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not file.filename.lower().endswith('.pdf'):
        return APIResponse(success=False, message="Please upload a valid PDF file.")
    try:
        user_id = user["sub"]
        token = user.get("access_token")
        content = await file.read()
        extracted_text = extract_text_from_pdf(content)
        ai_data = await generate_smart_notes(extracted_text, user_id=user_id)
        log_generation(user_id, "smart_notes", {"type": "pdf", "filename": file.filename}, title=f"Smart Notes: {file.filename}", prompt=extracted_text[:200], access_token=token)
        return APIResponse(success=True, data=ai_data)
    except Exception as e:
        return APIResponse(success=False, message=str(e))
