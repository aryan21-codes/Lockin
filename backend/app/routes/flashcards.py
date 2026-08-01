from fastapi import APIRouter, File, UploadFile, Form, Depends
import fitz  # PyMuPDF
from app.models.schemas import FlashcardGenerateRequest, APIResponse
from app.services.flashcard_service import generate_flashcards
from app.utils.database import get_flashcards, delete_flashcard, delete_all_flashcards
from app.dependencies.auth import (
    get_current_user, get_current_identity, require_guest_quota,
    AuthenticatedUser, GuestUser,
)

router = APIRouter(prefix="/api/flashcards", tags=["Flashcards"])


def _build_response(data, identity):
    """Build response with guest_usage metadata if applicable."""
    if isinstance(identity, GuestUser):
        return APIResponse(
            success=True,
            data=data,
        ).model_dump() | {
            "guest_usage": identity.payload.get("_guest_usage", {}),
            "guest_remaining": identity.payload.get("_guest_remaining", 0),
        }
    return APIResponse(success=True, data=data)


@router.post("/generate", response_model=None)
async def create_flashcards(
    request: FlashcardGenerateRequest,
    identity=Depends(require_guest_quota("flashcards")),
):
    """
    Takes a raw text block and generates difficulty-scaled AI flashcards.
    Guests: quota-checked, no DB persistence.
    """
    try:
        if isinstance(identity, AuthenticatedUser):
            token = identity.access_token
            flashcards = await generate_flashcards(request.text, request.difficulty, identity.user_id, access_token=token)
            return APIResponse(success=True, data=flashcards)
        else:
            # Guest: generate flashcards but don't save to DB
            flashcards = await generate_flashcards(request.text, request.difficulty, "guest", access_token=None)
            return _build_response(flashcards, identity)
    except Exception as e:
        return APIResponse(success=False, message=str(e))


@router.post("/upload", response_model=None)
async def create_flashcards_from_pdf(
    file: UploadFile = File(...),
    difficulty: str = Form("medium"),
    identity=Depends(require_guest_quota("flashcards")),
):
    """
    Extracts text from an uploaded PDF and immediately parses it into flashcards.
    Limits extraction to 30 pages proactively for API safety boundaries.
    """
    if not file.filename.endswith('.pdf'):
        return APIResponse(success=False, message="File must be a PDF")

    try:
        content = await file.read()
        pdf_document = fitz.open(stream=content, filetype="pdf")
        text = ""
        # Cap extraction bounds securely preventing mapping overflows
        for page_num in range(min(30, len(pdf_document))):
            page = pdf_document[page_num]
            text += page.get_text() + "\n"

        if isinstance(identity, AuthenticatedUser):
            token = identity.access_token
            flashcards = await generate_flashcards(text, difficulty, identity.user_id, access_token=token)
            return APIResponse(success=True, data=flashcards)
        else:
            flashcards = await generate_flashcards(text, difficulty, "guest", access_token=None)
            return _build_response(flashcards, identity)
    except Exception as e:
        return APIResponse(success=False, message=str(e))


# ─── Authenticated-only endpoints (unchanged) ─────────────────

@router.get("/", response_model=APIResponse)
async def get_user_flashcards(user: dict = Depends(get_current_user)):
    """
    Fetches historical flashcards generated natively via Supabase mapping.
    """
    data = get_flashcards(user["sub"], access_token=user.get("access_token"))
    return APIResponse(success=True, data=data)

@router.delete("/{flashcard_id}", response_model=APIResponse)
async def remove_flashcard(flashcard_id: str, user: dict = Depends(get_current_user)):
    """
    Note: Supabase RLS handles ensuring the user can only delete their own flashcard.
    But passing the token guarantees they are active.
    """
    success = delete_flashcard(flashcard_id, access_token=user.get("access_token"))
    if success:
        return APIResponse(success=True, message="Deleted successfully")
    return APIResponse(success=False, message="Failed to delete or not found")

@router.delete("/clear", response_model=APIResponse)
async def clear_all_flashcards(user: dict = Depends(get_current_user)):
    """
    Clears all flashcards for the current user.
    """
    success = delete_all_flashcards(user["sub"], access_token=user.get("access_token"))
    if success:
        return APIResponse(success=True, message="All flashcards deleted successfully")
    return APIResponse(success=False, message="Failed to delete flashcards")
