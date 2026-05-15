from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import TodoCreate, TodoResponse, APIResponse
from app.utils.database import get_todos, save_todo, update_todo, delete_todo
from typing import List, Optional
from pydantic import BaseModel
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/todos", tags=["todos"])

class TodoUpdate(BaseModel):
    title: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    completed: Optional[bool] = None

@router.get("/", response_model=APIResponse)
async def get_all_todos(user: dict = Depends(get_current_user)):
    data = get_todos(user["sub"], access_token=user.get("access_token"))
    return APIResponse(success=True, data=data)

@router.post("/", response_model=APIResponse)
async def create_todo(todo: TodoCreate, user: dict = Depends(get_current_user)):
    created = save_todo(user["sub"], todo.title, todo.priority, todo.due_date, access_token=user.get("access_token"))
    if created:
        return APIResponse(success=True, data=created)
    return APIResponse(success=False, message="Failed to create todo")

@router.put("/{todo_id}", response_model=APIResponse)
async def update_todo_item(todo_id: str, updates: TodoUpdate, user: dict = Depends(get_current_user)):
    updated = update_todo(todo_id, updates.model_dump(exclude_unset=True), access_token=user.get("access_token"))
    if updated: return APIResponse(success=True, data=updated)
    return APIResponse(success=False, message="Failed to update")

@router.delete("/{todo_id}", response_model=APIResponse)
async def delete_todo_item(todo_id: str, user: dict = Depends(get_current_user)):
    if delete_todo(todo_id, access_token=user.get("access_token")):
        return APIResponse(success=True, message="Deleted successfully")
    return APIResponse(success=False, message="Failed to delete")
