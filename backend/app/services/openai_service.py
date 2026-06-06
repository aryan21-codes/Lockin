import json
from openai import AsyncOpenAI
from app.utils.config import settings

# OpenRouter acts seamlessly as an OpenAI drop-in replacement
client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENAI_API_KEY,
)

async def _execute_completion_with_fallback(messages, model, max_tokens, temperature=0.7) -> str:
    """
    Executes a completion request. Promotes 'openai/gpt-4o-mini' to 'google/gemma-4-31b-it:free'
    as primary, falling back to 'google/gemma-4-26b-a4b-it:free' on rate limits or API issues.
    """
    primary_model = "google/gemma-4-31b-it:free"
    fallback_model = "google/gemma-4-26b-a4b-it:free"
    
    # Intercept gpt-4o-mini and route to gemma-4-31b-it:free directly
    if model == "openai/gpt-4o-mini":
        model = primary_model
        
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[OpenRouter Request Error] Model '{model}' failed: {e}")
        
        # If the primary gemma model failed or was rate limited, retry with the fallback gemma model
        if model == primary_model:
            print(f"[OpenRouter Fallback] Retrying with secondary free model '{fallback_model}'...")
            try:
                response = await client.chat.completions.create(
                    model=fallback_model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                return response.choices[0].message.content.strip()
            except Exception as fallback_err:
                import traceback
                print(f"[OpenRouter Fallback Error] Secondary model '{fallback_model}' also failed:")
                traceback.print_exc()
                raise fallback_err
        raise e

async def generate_json_response(system_prompt: str, user_prompt: str, model="openai/gpt-4o-mini", max_tokens=1500) -> dict:
    """
    Core AI wrapper mapped to OpenRouter, with credit exhaustion fallback.
    """
    try:
        content = await _execute_completion_with_fallback(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt + "\n\nCRITICAL: You MUST respond ONLY with valid, raw JSON. No markdown syntax, no intro, no outro."},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=max_tokens
        )
        
        content_str = content.strip()
        
        # Robustly extract JSON object by finding the first '{' and last '}'
        start_idx = content_str.find('{')
        end_idx = content_str.rfind('}')
        if start_idx != -1 and end_idx != -1:
            content_str = content_str[start_idx:end_idx+1]
        
        try:
            data = json.loads(content_str)
            return data
        except json.JSONDecodeError as jde:
            # Attempt to clean common open-source LLM JSON quirks (e.g. trailing commas)
            import re
            # Remove trailing commas before closing braces/brackets
            cleaned_str = re.sub(r',\s*([}\]])', r'\1', content_str)
            try:
                data = json.loads(cleaned_str)
                return data
            except Exception:
                # Re-raise the original decode error if cleanup fails
                raise jde
    except Exception as e:
        print(f"[OpenRouter Execution Error]: {e}")
        raise ValueError(f"AI Generation Failed: {str(e)}")

async def generate_text_response(system_prompt: str, user_prompt: str, model="openai/gpt-4o-mini", max_tokens=2000) -> str:
    """
    Generates plain text response without JSON constraints, with credit exhaustion fallback.
    """
    try:
        content = await _execute_completion_with_fallback(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=max_tokens
        )
        return content
    except Exception as e:
        print(f"[OpenRouter Execution Error]: {e}")
        raise ValueError(f"AI Generation Failed: {str(e)}")
