import os
import sys
import time
import asyncio
import httpx
from dotenv import load_dotenv

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, backend_dir)
load_dotenv(os.path.join(backend_dir, '.env'))

from openai import AsyncOpenAI
from app.utils.config import settings

client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENAI_API_KEY,
)

async def test_model(model_name: str):
    start = time.time()
    try:
        response = await client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a helpful assistant. Output raw JSON ONLY: {\"status\": \"ok\"}"},
                {"role": "user", "content": "Return the status JSON."}
            ],
            temperature=0.3,
            max_tokens=100
        )
        msg = response.choices[0].message
        content = msg.content
        elapsed = time.time() - start
        if content is None:
            print(f"[EMPTY CONTENT] {model_name} ({elapsed:.2f}s)", flush=True)
            return False
        content_clean = content.strip().replace('\n', ' ')
        print(f"[PASS] {model_name} ({elapsed:.2f}s) -> {content_clean[:90]}", flush=True)
        return True
    except Exception as e:
        elapsed = time.time() - start
        err = str(e)
        if "404" in err:
            status = "404 NOT FOUND"
        elif "429" in err:
            status = "429 RATE LIMIT"
        elif "403" in err:
            status = "403 FORBIDDEN"
        else:
            status = f"ERROR: {err[:80]}"
        print(f"[{status}] {model_name} ({elapsed:.2f}s)", flush=True)
        return False

async def main():
    models = [
        "openrouter/free",
        "minimax/minimax-m3:free",
        "nvidia/nemotron-3.5-lightning:free",
        "poolside/laguna-s-2.1:free",
        "liquid/lfm-2.5-2.6b:free",
        "inclusionai/ling-3.0-flash-sante:free",
        "google/gemma-4-31b-it:free",
        "google/gemma-4-26b-a4b-it:free",
    ]
    print(f"Testing {len(models)} models...", flush=True)
    successful = []
    for m in models:
        success = await test_model(m)
        if success:
            successful.append(m)
            
    print("\n--- WORKING MODELS ---", flush=True)
    for s in successful:
        print(f" - {s}", flush=True)

if __name__ == "__main__":
    asyncio.run(main())

