from fastapi import APIRouter, Depends
from app.models.schemas import APIResponse
from app.utils.database import get_sticky_notes, save_sticky_note, update_sticky_note, delete_sticky_note
from typing import Optional
from pydantic import BaseModel
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/sticky-notes", tags=["sticky-notes"])

class StickyNoteCreate(BaseModel):
    text: str = ""
    color: str = "yellow"
    x: float = 50
    y: float = 50

class StickyNoteUpdate(BaseModel):
    text: Optional[str] = None
    color: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None

@router.get("/", response_model=APIResponse)
async def get_all_sticky_notes(user: dict = Depends(get_current_user)):
    data = get_sticky_notes(user["sub"], access_token=user.get("access_token"))
    return APIResponse(success=True, data=data)

@router.post("/", response_model=APIResponse)
async def create_sticky_note(note: StickyNoteCreate, user: dict = Depends(get_current_user)):
    created = save_sticky_note(
        user["sub"], note.text, note.color, note.x, note.y,
        access_token=user.get("access_token")
    )
    if created:
        return APIResponse(success=True, data=created)
    return APIResponse(success=False, message="Failed to create sticky note")

@router.put("/{note_id}", response_model=APIResponse)
async def update_sticky_note_item(note_id: str, updates: StickyNoteUpdate, user: dict = Depends(get_current_user)):
    updated = update_sticky_note(note_id, updates.model_dump(exclude_unset=True), access_token=user.get("access_token"))
    if updated:
        return APIResponse(success=True, data=updated)
    return APIResponse(success=False, message="Failed to update sticky note")

@router.delete("/{note_id}", response_model=APIResponse)
async def delete_sticky_note_item(note_id: str, user: dict = Depends(get_current_user)):
    if delete_sticky_note(note_id, access_token=user.get("access_token")):
        return APIResponse(success=True, message="Deleted successfully")
    return APIResponse(success=False, message="Failed to delete")
