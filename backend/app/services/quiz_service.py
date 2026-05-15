from app.services.openai_service import generate_json_response
from app.utils.chunking import chunk_text


async def generate_quiz(text: str, num_mcq: int = 5, num_short: int = 3, model="openai/gpt-4o-mini") -> dict:
    """
    Generates quiz questions (MCQs + short answer) from study material.
    Returns structured JSON with both question types.
    """
    if not text.strip():
        raise ValueError("Cannot generate quiz from empty text.")

    chunks = chunk_text(text, chunk_size=80000, overlap=1000)
    combined_text = text if len(chunks) == 1 else "\n...\n".join(chunks[:3])

    system_prompt = f"""You are an expert academic examiner creating a quiz from study material.
Your task is to generate challenging but fair questions that test understanding of the core concepts.

Output ONLY a JSON object matching this EXACT structure:
{{
  "mcq": [
    {{
      "question": "Clear question testing a specific concept",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": "The exact text of the correct option",
      "explanation": "Brief explanation of why this answer is correct"
    }}
  ],
  "short": [
    {{
      "question": "A question requiring a short written answer",
      "answer": "The model answer (2-3 sentences)"
    }}
  ]
}}

Generate exactly {num_mcq} MCQ questions and {num_short} short-answer questions.
Ensure questions cover different topics from the material and vary in difficulty.
Each MCQ must have exactly 4 options with only one correct answer.
Make distractors plausible but clearly wrong upon careful reading."""

    response = await generate_json_response(
        system_prompt,
        f"Study material to create quiz from:\n\n{combined_text}",
        model=model,
        max_tokens=3000
    )

    # Validate structure
    mcq_list = response.get("mcq", [])
    short_list = response.get("short", [])

    return {
        "mcq": mcq_list,
        "short": short_list
    }
