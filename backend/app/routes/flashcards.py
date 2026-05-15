from fastapi import APIRouter, File, UploadFile, Form, Depends
import fitz  # PyMuPDF
from app.models.schemas import FlashcardGenerateRequest, APIResponse
from app.services.flashcard_service import generate_flashcards
from app.utils.database import get_flashcards, delete_flashcard, delete_all_flashcards
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/flashcards", tags=["Flashcards"])

@router.post("/generate", response_model=APIResponse)
async def create_flashcards(request: FlashcardGenerateRequest, user: dict = Depends(get_current_user)):
    """
    Takes a raw text block and generates difficulty-scaled AI flashcards.
    """
    try:
        token = user.get("access_token")
        flashcards = await generate_flashcards(request.text, request.difficulty, user["sub"], access_token=token)
        return APIResponse(success=True, data=flashcards)
    except Exception as e:
        return APIResponse(success=False, message=str(e))

@router.post("/upload", response_model=APIResponse)
async def create_flashcards_from_pdf(
    file: UploadFile = File(...), 
    difficulty: str = Form("medium"),
    user: dict = Depends(get_current_user)
):
    """
    Extracts text from an uploaded PDF and immediately parses it into flashcards.
    Limits extraction to 30 pages proactively for API safety boundaries.
    """
    if not file.filename.endswith('.pdf'):
        return APIResponse(success=False, message="File must be a PDF")
    
    try:
        token = user.get("access_token")
        content = await file.read()
        pdf_document = fitz.open(stream=content, filetype="pdf")
        text = ""
        # Cap extraction bounds securely preventing mapping overflows
        for page_num in range(min(30, len(pdf_document))):
            page = pdf_document[page_num]
            text += page.get_text() + "\n"
        
        # Pipeline it into the orchestrator natively
        flashcards = await generate_flashcards(text, difficulty, user["sub"], access_token=token)
        return APIResponse(success=True, data=flashcards)
    except Exception as e:
        return APIResponse(success=False, message=str(e))

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
