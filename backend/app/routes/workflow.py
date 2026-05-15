import os
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.models.schemas import APIResponse
from app.services.workflow_service import run_study_pipeline
from app.services.ingestion_service import ingest_workflow_result
from app.utils.database import save_workflow_result, get_workflow_results
from app.dependencies.auth import get_current_user
import asyncio

router = APIRouter(prefix="/api/ai/workflow", tags=["AI Workflow"])

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".text"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post("/upload", response_model=APIResponse)
async def run_workflow(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """
    Accepts a PDF or text file, runs the full AI study pipeline:
      1. Extract text
      2. Generate summary + key points
      3. Generate flashcards
      4. Generate quiz (MCQ + short answer)

    Returns structured JSON with all results.
    """
    user_id = user["sub"]
    token = user.get("access_token")

    # Validate file extension
    filename = file.filename or "upload"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return APIResponse(
            success=False,
            message=f"Unsupported file type '{ext}'. Please upload a PDF or text file."
        )

    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        return APIResponse(success=False, message=f"Failed to read file: {str(e)}")

    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        return APIResponse(
            success=False,
            message=f"File too large ({len(content) // (1024*1024)}MB). Maximum is 20MB."
        )

    if len(content) == 0:
        return APIResponse(success=False, message="File is empty.")

    # Run the full pipeline
    try:
        result = await run_study_pipeline(
            user_id=user_id,
            filename=filename,
            file_bytes=content,
            file_ext=ext
        )

        # Store the workflow result in Supabase
        save_workflow_result(
            user_id=user_id,
            source_file=filename,
            result_data=result,
            access_token=token
        )

        # Trigger background ingestion into the knowledge graph
        try:
            asyncio.get_running_loop().create_task(
                ingest_workflow_result(
                    user_id=user_id,
                    workflow_result=result,
                    access_token=token,
                )
            )
            print(f"[Workflow] Background ingestion triggered for {filename}")
        except Exception as ingest_err:
            print(f"[Workflow] Ingestion trigger failed (non-fatal): {ingest_err}")

        return APIResponse(success=True, data=result)

    except ValueError as e:
        return APIResponse(success=False, message=str(e))
    except Exception as e:
        print(f"[Workflow Pipeline Error]: {e}")
        return APIResponse(
            success=False,
            message=f"Pipeline failed: {str(e)}"
        )


@router.get("/history", response_model=APIResponse)
async def get_workflow_history(user: dict = Depends(get_current_user)):
    """
    Returns past workflow runs for the authenticated user.
    """
    user_id = user["sub"]
    token = user.get("access_token")
    results = get_workflow_results(user_id, access_token=token)
    return APIResponse(success=True, data=results)
