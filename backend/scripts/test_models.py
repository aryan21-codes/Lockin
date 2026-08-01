import os
import sys
import time
import asyncio
from dotenv import load_dotenv

# Add backend directory to path
backend_dir = r'c:\Users\ultra\Downloads\SIGMA WEB DEV\Lockin\backend'
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
        "meta-llama/llama-3-8b-instruct:free",
        "google/gemma-2-9b-it:free",
        "qwen/qwen-2.5-72b-instruct:free",
        "meta-llama/llama-3.1-8b-instruct:free"
    ]
    for model in models:
        await test_model(model)

if __name__ == "__main__":
    asyncio.run(main())
