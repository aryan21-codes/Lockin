from fastapi import APIRouter, Depends
from app.models.schemas import CodeExplainerRequest, APIResponse, CodeChatRequest
from app.services.code_explainer_service import generate_code_explanation
from app.services.chat_service import generate_code_chat_response
from app.utils.database import get_code_explanations
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/code-explainer", tags=["Code Explainer"])

@router.post("/explain", response_model=APIResponse)
async def explain_code_endpoint(request: CodeExplainerRequest, user: dict = Depends(get_current_user)):
    """
    Submits raw code string mappings scaling out through OpenRouter architecture.
    """
    try:
        token = user.get("access_token")
        explanation_data = await generate_code_explanation(request.code, request.language, user["sub"], access_token=token)
        return APIResponse(success=True, data=explanation_data)
    except Exception as e:
        return APIResponse(success=False, message=str(e))

@router.post("/chat", response_model=APIResponse)
async def chat_code_endpoint(request: CodeChatRequest, user: dict = Depends(get_current_user)):
    """
    Handles context-aware follow-up questions from the user about the code snippet.
    """
    try:
        response_text = await generate_code_chat_response(
            code=request.code,
            explanation=request.explanation,
            history=request.history,
            question=request.question,
            mode=request.mode
        )
        return APIResponse(success=True, data={"reply": response_text})
    except Exception as e:
        return APIResponse(success=False, message=str(e))

@router.get("/history", response_model=APIResponse)
async def get_user_code_history(user: dict = Depends(get_current_user)):
    """
    Fetches historically logged breakdowns stored dynamically in Supabase instances.
    """
    data = get_code_explanations(user["sub"], access_token=user.get("access_token"))
    return APIResponse(success=True, data=data)
