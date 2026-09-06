import json
import re
import traceback
from typing import Any, Union
from openai import AsyncOpenAI
from app.utils.config import settings

# OpenRouter acts seamlessly as an OpenAI drop-in replacement
client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENAI_API_KEY,
)

# Verified active free models on OpenRouter (ordered by speed and capability)
ACTIVE_FREE_MODELS = [
    "openrouter/free",
    "minimax/minimax-m3:free",
    "inclusionai/ling-3.0-flash-sante:free",
    "liquid/lfm-2.5-2.6b:free",
    "nvidia/nemotron-3.5-lightning:free",
]

def _clean_and_parse_json(raw_text: str) -> Union[dict, list]:
    """
    Robustly extracts and parses JSON (dict or list) from LLM output,
    handling markdown blocks, reasoning tokens, and trailing commas.
    """
    if not raw_text:
        raise ValueError("Cannot parse empty response as JSON.")

    text = raw_text.strip()

    # 1. Strip reasoning blocks (e.g. <think>...</think>)
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()

    # 2. Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 3. Extract from markdown code fences if present
    fence_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    if fence_match:
        fence_content = fence_match.group(1).strip()
        try:
            return json.loads(fence_content)
        except json.JSONDecodeError:
            text = fence_content

    # 4. Find boundaries: object {...} or array [...]
    first_brace = text.find('{')
    first_bracket = text.find('[')

    if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
        last_brace = text.rfind('}')
        if last_brace != -1 and last_brace > first_brace:
            candidate = text[first_brace:last_brace + 1]
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                # Remove trailing commas
                cleaned = re.sub(r',\s*([}\]])', r'\1', candidate)
                try:
                    return json.loads(cleaned)
                except json.JSONDecodeError:
                    pass
    elif first_bracket != -1:
        last_bracket = text.rfind(']')
        if last_bracket != -1 and last_bracket > first_bracket:
            candidate = text[first_bracket:last_bracket + 1]
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                # Remove trailing commas
                cleaned = re.sub(r',\s*([}\]])', r'\1', candidate)
                try:
                    return json.loads(cleaned)
                except json.JSONDecodeError:
                    pass

    # 5. Final attempt with trailing comma cleanup on the full string
    cleaned = re.sub(r',\s*([}\]])', r'\1', text)
    return json.loads(cleaned)


async def _execute_single_completion(messages, model: str, max_tokens: int, temperature: float = 0.7) -> str:
    """
    Executes a single chat completion against OpenRouter for a specific model.
    """
    response = await client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    msg = response.choices[0].message
    content = msg.content
    if not content:
        # Check for reasoning fields if main content is empty (for reasoning models)
        content = getattr(msg, "reasoning", None) or getattr(msg, "reasoning_content", None)

    if content and content.strip():
        return content.strip()

    raise ValueError(f"Model '{model}' returned empty content.")


async def _execute_completion_with_fallback(messages, model: str, max_tokens: int, temperature: float = 0.7) -> str:
    """
    Executes a text completion request with multi-model fallback across ACTIVE_FREE_MODELS.
    """
    if model in ("openai/gpt-4o-mini", "openrouter/free"):
        candidate_models = list(ACTIVE_FREE_MODELS)
    else:
        candidate_models = [model] + [m for m in ACTIVE_FREE_MODELS if m != model]

    last_error = None
    for candidate in candidate_models:
        try:
            return await _execute_single_completion(messages, candidate, max_tokens, temperature)
        except Exception as e:
            last_error = e
            print(f"[OpenRouter Fallback] Model '{candidate}' failed: {e}. Retrying next model...")

    if last_error:
        raise last_error
    raise ValueError("All candidate models failed to produce a valid response.")


async def generate_json_response(system_prompt: str, user_prompt: str, model="openai/gpt-4o-mini", max_tokens=1500) -> Any:
    """
    Generates a structured JSON response with multi-model cascade and automatic schema repair.
    """
    if model in ("openai/gpt-4o-mini", "openrouter/free"):
        candidate_models = list(ACTIVE_FREE_MODELS)
    else:
        candidate_models = [model] + [m for m in ACTIVE_FREE_MODELS if m != model]

    messages = [
        {
            "role": "system",
            "content": system_prompt + "\n\nCRITICAL: You MUST respond ONLY with valid, raw JSON. No markdown syntax, no explanations, no text before or after the JSON."
        },
        {"role": "user", "content": user_prompt}
    ]

    last_error = None
    for candidate in candidate_models:
        try:
            raw_content = await _execute_single_completion(
                messages=messages,
                model=candidate,
                max_tokens=max_tokens,
                temperature=0.4
            )
            data = _clean_and_parse_json(raw_content)
            return data
        except Exception as e:
            last_error = e
            print(f"[JSON Generation] Model '{candidate}' failed: {e}. Retrying with next model...")

    print(f"[JSON Generation Error] All models failed. Last error: {last_error}")
    if last_error:
        raise last_error
    raise ValueError("Failed to generate valid JSON response from all available models.")


async def generate_text_response(system_prompt: str, user_prompt: str, model="openai/gpt-4o-mini", max_tokens=2000) -> str:
    """
    Generates plain text response without JSON constraints, with multi-model fallback.
    """
    try:
        content = await _execute_completion_with_fallback(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=model,
            max_tokens=max_tokens,
            temperature=0.7
        )
        return content
    except Exception as e:
        print(f"[OpenRouter Execution Error]: {e}")
        raise ValueError(f"AI Generation Failed: {str(e)}")

