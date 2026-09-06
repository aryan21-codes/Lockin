import os
import sys
import asyncio

from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

from app.services.openai_service import generate_json_response, generate_text_response

async def main():
    print("Calling generate_json_response...")
    try:
        res = await generate_json_response(
            system_prompt="You are a helpful assistant. Return JSON containing a single field: 'hello' with value 'world'.",
            user_prompt="Return JSON.",
            model="openai/gpt-4o-mini"
        )
        print("Response received:")
        print(res)
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(main())
