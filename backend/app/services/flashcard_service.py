from app.services.openai_service import generate_json_response
from app.utils.chunking import chunk_text
from app.utils.database import save_flashcards

async def generate_flashcards(text: str, difficulty: str = "medium", user_id: str = "anonymous", model="openai/gpt-4o-mini", access_token: str = None) -> list:
    """
    Parses input text, instructs OpenAI to extract core principles into a Flashcard schema,
    and forwards the returning JSON tree into Supabase persistence.
    """
    if not text.strip():
        raise ValueError("Cannot generate flashcards from empty text.")

    # Truncate/Chunk exceptionally large files so context doesn't dilute the generation
    chunks = chunk_text(text, chunk_size=80000, overlap=1000)
    combined_text = text if len(chunks) == 1 else "\n...\n".join(chunks[:3])
    
    system_prompt = f"""You are an expert academic tutor.
Your task is to generate {difficulty}-level flashcards from the provided study material.
Extract the most important core concepts, definitions, formulas, and rules.
Output ONLY a JSON object that strictly matches this structure:
{{
  "flashcards": [
    {{
      "question": "Clear, standalone question testing a specific concept",
      "answer": "Concise, accurate answer",
      "difficulty": "{difficulty}"
    }}
  ]
}}
Aim to generate between 5 and 15 highly effective flashcards based on the material's density. Ensure all questions make sense out of context."""

    response = await generate_json_response(
        system_prompt, 
        f"Material to process:\n\n{combined_text}", 
        model=model
    )
    
    flashcards_list = response.get("flashcards", [])
    
    if flashcards_list:
        # Commit directly to Postgres via wrapper
        saved_records = save_flashcards(user_id, flashcards_list, access_token=access_token)
        # Fallback to returning raw array if Supabase table isn't created yet gracefully
        return saved_records if saved_records else flashcards_list
        
    return []
