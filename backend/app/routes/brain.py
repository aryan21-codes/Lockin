"""
Brain API Router — exposes knowledge graph, RAG, insights, and revision endpoints.
All endpoints are user-scoped via JWT authentication.
"""
from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from app.models.schemas import APIResponse
from app.dependencies.auth import get_current_user
from app.services.graph_service import get_knowledge_graph
from app.services.rag_service import ask_knowledge_base
from app.services.insights_service import (
    generate_insights,
    get_revision_schedule,
    update_confidence,
    ensure_revision_entries,
    generate_weak_topic_quiz,
    explain_weak_topics,
)
from app.services.ingestion_service import ingest_content, ingest_workflow_result
from app.utils.database import get_supabase

router = APIRouter(prefix="/api/brain", tags=["AI Second Brain"])


# ─── Request Schemas ───

class AskRequest(BaseModel):
    question: str

class ConfidenceUpdateRequest(BaseModel):
    topic: str
    correct: bool

class IngestRequest(BaseModel):
    content: str
    source_type: str = "manual"
    source_title: str = ""


# ─── Endpoints ───

@router.get("/graph", response_model=APIResponse)
async def get_graph(user: dict = Depends(get_current_user)):
    """Returns the user's knowledge graph (nodes + edges)."""
    user_id = user["sub"]
    token = user.get("access_token")
    try:
        graph = await get_knowledge_graph(user_id, access_token=token)
        return APIResponse(success=True, data=graph)
    except Exception as e:
        return APIResponse(success=False, message=str(e))


@router.post("/ask", response_model=APIResponse)
async def ask_brain(request: AskRequest, user: dict = Depends(get_current_user)):
    """RAG query — ask the user's own knowledge base."""
    user_id = user["sub"]
    token = user.get("access_token")
    try:
        result = await ask_knowledge_base(
            user_id=user_id,
            question=request.question,
            access_token=token,
        )
        return APIResponse(success=True, data=result)
    except Exception as e:
        return APIResponse(success=False, message=str(e))


@router.get("/insights", response_model=APIResponse)
async def get_insights(user: dict = Depends(get_current_user)):
    """Smart study insights + weak area detection."""
    user_id = user["sub"]
    token = user.get("access_token")
    try:
        # Ensure all nodes have revision entries
        await ensure_revision_entries(user_id, access_token=token)
        result = await generate_insights(user_id, access_token=token)
        return APIResponse(success=True, data=result)
    except Exception as e:
        return APIResponse(success=False, message=str(e))


@router.get("/revision", response_model=APIResponse)
async def get_revision(user: dict = Depends(get_current_user)):
    """Topics due for review today."""
    user_id = user["sub"]
    token = user.get("access_token")
    try:
        schedule = await get_revision_schedule(user_id, access_token=token)
        return APIResponse(success=True, data=schedule)
    except Exception as e:
        return APIResponse(success=False, message=str(e))


@router.post("/revision/update", response_model=APIResponse)
async def update_revision(request: ConfidenceUpdateRequest, user: dict = Depends(get_current_user)):
    """Update spaced repetition confidence after review."""
    user_id = user["sub"]
    token = user.get("access_token")
    try:
        result = await update_confidence(
            user_id=user_id,
            topic=request.topic,
            correct=request.correct,
            access_token=token,
        )
        return APIResponse(success=True, data=result, message="Confidence updated")
    except Exception as e:
        return APIResponse(success=False, message=str(e))


@router.post("/reinforce", response_model=APIResponse)
async def reinforce_learning(user: dict = Depends(get_current_user)):
    """Explain weak topics in detail."""
    user_id = user["sub"]
    token = user.get("access_token")
    try:
        result = await explain_weak_topics(user_id, access_token=token)
        return APIResponse(success=True, data=result)
    except Exception as e:
        return APIResponse(success=False, message=str(e))


@router.post("/weak-quiz", response_model=APIResponse)
async def weak_area_quiz(user: dict = Depends(get_current_user)):
    """Auto-generate quiz from weakest topics."""
    user_id = user["sub"]
    token = user.get("access_token")
    try:
        result = await generate_weak_topic_quiz(user_id, access_token=token)
        return APIResponse(success=True, data=result)
    except Exception as e:
        return APIResponse(success=False, message=str(e))


@router.post("/ingest", response_model=APIResponse)
async def manual_ingest(request: IngestRequest, user: dict = Depends(get_current_user)):
    """Manually ingest content into the knowledge base."""
    user_id = user["sub"]
    token = user.get("access_token")
    try:
        result = await ingest_content(
            user_id=user_id,
            content=request.content,
            source_type=request.source_type,
            source_title=request.source_title,
            access_token=token,
        )
        return APIResponse(success=True, data=result, message="Content ingested")
    except Exception as e:
        return APIResponse(success=False, message=str(e))

@router.post("/backfill", response_model=APIResponse)
async def backfill_history(background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """
    Scans past workflows in content_generations and retroactively ingests them
    into the knowledge graph using the user's valid JWT token.
    """
    user_id = user["sub"]
    token = user.get("access_token")
    client = get_supabase(access_token=token)
    
    if not client:
        return APIResponse(success=False, message="Database connection error")
        
    try:
        # Fetch historical workflows
        result = client.table("content_generations") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("content_type", "workflow") \
            .execute()
            
        records = result.data or []
        if not records:
            return APIResponse(success=True, message="No past workflows found to sync.")
        
        async def process_all():
            for record in records:
                try:
                    await ingest_workflow_result(
                        user_id=user_id,
                        workflow_result=record.get("content", {}),
                        access_token=token
                    )
                except Exception as e:
                    print(f"[Backfill] Error processing record {record.get('id')}: {e}")
                    
        # Fire and forget safely using FastAPI BackgroundTasks
        background_tasks.add_task(process_all)
        
        return APIResponse(success=True, data={"count": len(records)}, message=f"Started syncing {len(records)} previous workflows into your graph! Please check back in a few moments.")
        
    except Exception as e:
        import traceback
        with open("debug_error.txt", "w") as f:
            f.write(traceback.format_exc())
        return APIResponse(success=False, message=str(e))
