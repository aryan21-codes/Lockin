from app.services.openai_service import generate_json_response
from app.utils.database import save_code_explanation

async def generate_code_explanation(code: str, language: str = "javascript", user_id: str = "anonymous", model="openai/gpt-4o-mini", access_token: str = None) -> dict:
    """
    Submits raw code strings to the LLM forcing it into a teaching persona.
    Strictly instructs logical groupings of text explaining the architecture. 
    """
    if not code.strip():
        raise ValueError("Cannot explain empty code snippet.")
        
    system_prompt = f"""You are an expert programming mentor carefully teaching a student.
Your task is to analyze the provided {language} code snippet and break it down logically.
Use simple, beginner-friendly terminology without over-complicating technical jargon.
Output ONLY a JSON object that strictly matches this exact structure:
{{
  "summary": "A friendly 2-3 sentence overview of what this entire script accomplishes globally.",
  "line_by_line": [
    {{
      "line": "Let x = 42;",
      "explanation": "A short, simple explanation of why this logic exists and what it does"
    }}
  ],
  "improvements": [
    "A clear, actionable suggestion on how to improve performance, readability, or reliability.",
    "Another optional algorithmic or stylistic beginner-friendly tip."
  ]
}}
Ensure every major structural piece of logic in the code is isolated and explained in the `line_by_line` array sequentially."""

    response = await generate_json_response(
        system_prompt, 
        f"Please explain this {language} code:\n\n```{language}\n{code}\n```", 
        model=model,
        max_tokens=3000
    )
    
    # Attempt to commit directly to Supabase via wrapper
    saved_record = save_code_explanation(user_id, code, response, access_token=access_token)
    
    # Return augmented object holding the Supabase DB identity gracefully tracking telemetry
    if saved_record:
        return {
            "id": saved_record.get("id"),
            "user_id": saved_record.get("user_id"),
            "code": saved_record.get("code"),
            "explanation": saved_record.get("explanation", response),
            "created_at": saved_record.get("created_at")
        }
        
    # Fallback to local runtime object if Supabase table is missing
    from datetime import datetime
    import uuid
    return {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "code": code,
        "explanation": response,
        "created_at": datetime.utcnow().isoformat()
    }
