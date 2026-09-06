import os
import sys
import time
import asyncio
from dotenv import load_dotenv

# Add backend directory to path
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
    print(f"\nTesting model: {model_name}")
    start = time.time()
    try:
        response = await client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a helpful assistant. Respond with ONLY a JSON containing a single key 'status' with value 'ok'."},
                {"role": "user", "content": "Hello"}
            ],
            temperature=0.7,
            max_tokens=50
        )
        content = response.choices[0].message.content.strip()
        elapsed = time.time() - start
        print(f"Success! Time: {elapsed:.2f}s | Response: {content}")
        return elapsed, content
    except Exception as e:
        print(f"Failed! Time: {time.time() - start:.2f}s | Error: {e}")
        return None, None

async def main():
    models = [
        "openrouter/free",
        "google/gemma-4-31b-it:free",
        "google/gemma-4-26b-a4b-it:free",
        "nvidia/nemotron-3.5-lightning:free",
        "minimax/minimax-m2.7:free",
        "minimax/minimax-m3:free",
    ]
    for model in models:
        await test_model(model)

if __name__ == "__main__":
    asyncio.run(main())
