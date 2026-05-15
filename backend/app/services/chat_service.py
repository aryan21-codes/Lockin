import json
from app.services.openai_service import generate_text_response

async def generate_code_chat_response(
    code: str,
    explanation: dict | str,
    history: list,
    question: str,
    mode: str = "default",
    model: str = "openai/gpt-4o-mini"
) -> str:
    """
    Context-aware AI tutor chatbot for code explanation.
    Maintains context of the original code, the generated explanation, and previous chat history.
    """
    
    # Format the explanation context correctly if it's a dict
    exp_context = explanation
    if isinstance(explanation, dict):
        exp_context = json.dumps(explanation, indent=2)

    # Base System Prompt
    system_prompt = f"""You are an expert coding tutor helping a student understand code deeply.
Your primary goal is to provide clear, educational, and beginner-friendly answers.

CRITICAL INSTRUCTIONS:
- You must always base your answers on the PROVIDED CODE and the PREVIOUS EXPLANATION.
- Always remember the CONVERSATION HISTORY when responding.
- Do NOT act like a generic AI assistant. You are a specialized code tutor.
- Explain concepts clearly, using analogies if helpful.

CONTEXT PROVIDED:
--- ORIGINAL CODE ---
{code}

--- PREVIOUS EXPLANATION ---
{exp_context}
"""

    # Adjust behavior based on mode
    if mode == "beginner":
        system_prompt += "\nMODE: Beginner. Use very simple language. Avoid complex jargon. Explain like I'm a complete beginner."
    elif mode == "interview":
        system_prompt += "\nMODE: Interview. Focus on time/space complexity, optimizations, edge cases, and best practices."
    elif mode == "dry_run":
        system_prompt += "\nMODE: Dry Run. When explaining, trace the code execution step-by-step with example values."

    # Format the conversation history
    history_context = ""
    if history:
        history_context = "\n--- CONVERSATION HISTORY ---\n"
        for msg in history:
            role = "Student" if msg.role == "user" else "Tutor"
            history_context += f"{role}: {msg.content}\n\n"
        
        system_prompt += history_context

    # Ensure the AI knows its final task
    system_prompt += "\nNow, answer the student's latest question based on all the context above."

    # Generate response
    response = await generate_text_response(
        system_prompt=system_prompt,
        user_prompt=question,
        model=model,
        max_tokens=1500
    )
    
    return response
