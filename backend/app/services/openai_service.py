import json
from openai import AsyncOpenAI
from app.utils.config import settings

# OpenRouter acts seamlessly as an OpenAI drop-in replacement
client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENAI_API_KEY,
)

async def generate_json_response(system_prompt: str, user_prompt: str, model="openai/gpt-4o-mini", max_tokens=1500) -> dict:
    """
    Core AI wrapper mapped to OpenRouter.
    """
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt + "\n\nCRITICAL: You MUST respond ONLY with valid, raw JSON. No markdown syntax, no intro, no outro."},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=max_tokens
        )
        
        content = response.choices[0].message.content.strip()
        # Clean up any potential markdown syntax wrapping the JSON block occasionally emitted by Mistral
        if content.startswith("```json"):
            content = content.replace("```json", "", 1)
        if content.startswith("```"):
            content = content.replace("```", "", 1)
        if content.endswith("```"):
            content = content[:-3]
            
        data = json.loads(content.strip())
        return data
    except Exception as e:
        print(f"[OpenRouter Execution Error]: {e}")
        raise ValueError(f"AI Generation Failed: {str(e)}")

async def generate_text_response(system_prompt: str, user_prompt: str, model="openai/gpt-4o-mini", max_tokens=2000) -> str:
    """
    Generates plain text response without JSON constraints.
    """
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[OpenRouter Execution Error]: {e}")
        raise ValueError(f"AI Generation Failed: {str(e)}")
