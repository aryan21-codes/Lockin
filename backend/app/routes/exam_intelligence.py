from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from typing import List, Optional
import os

from app.models.schemas import APIResponse
from app.services.exam_intelligence_service import run_exam_intelligence_pipeline
from app.utils.database import save_exam_intelligence_result, get_exam_intelligence_results
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/ai/exam-intelligence", tags=["Exam Intelligence"])

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".text", ".docx"}

async def read_files(files: List[UploadFile], file_type: str) -> List[dict]:
    processed = []
    for file in files:
        if not file.filename:
            continue
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue
        try:
            content = await file.read()
            if len(content) > 0:
                processed.append({
                    "filename": file.filename,
                    "content": content,
                    "type": file_type
                })
        except Exception as e:
            print(f"Failed to read file {file.filename}: {e}")
    return processed

@router.post("/run", response_model=APIResponse)
async def run_exam_intel(
    notes_files: List[UploadFile] = File([]),
    pyq_files: List[UploadFile] = File([]),
    qb_files: List[UploadFile] = File([]),
    time_available: str = Form("3 days"),
    user: dict = Depends(get_current_user)
):
    user_id = user["sub"]
    token = user.get("access_token")

    # Read all files and categorize
    all_files_data = []
    all_files_data.extend(await read_files(notes_files, "notes"))
    all_files_data.extend(await read_files(pyq_files, "pyq"))
    all_files_data.extend(await read_files(qb_files, "question_bank"))

    if not all_files_data:
        return APIResponse(success=False, message="No valid study materials uploaded. Please upload PDF or TXT files.")

    try:
        result = await run_exam_intelligence_pipeline(
            user_id=user_id,
            files_data=all_files_data,
            time_available=time_available
        )

        save_exam_intelligence_result(
            user_id=user_id,
            result_data=result,
            access_token=token
        )

        return APIResponse(success=True, data=result)
    except Exception as e:
        print(f"[Exam Intel Pipeline Error]: {e}")
        return APIResponse(success=False, message=f"Pipeline failed: {str(e)}")


@router.get("/history", response_model=APIResponse)
async def get_exam_intel_history(user: dict = Depends(get_current_user)):
    user_id = user["sub"]
    token = user.get("access_token")
    results = get_exam_intelligence_results(user_id, access_token=token)
    return APIResponse(success=True, data=results)
