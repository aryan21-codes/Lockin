import os
import sys
import asyncio

from dotenv import load_dotenv

print("[Debug] Appending path...")
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

try:
    print("[Debug] Importing generate_ppt_file...")
    from app.services.ppt_service import generate_ppt_file
    print("[Debug] Imported successfully!")
except Exception as e:
    print(f"[Debug] Failed to import: {e}")
    sys.exit(1)

async def main():
    print("[Debug] Entering main...")
    topic = "Quantum Computing and Future Technologies"
    try:
        print(f"[Debug] Starting generate_ppt_file for: {topic}...")
        filepath = await generate_ppt_file(
            prompt_text=topic,
            num_slides=5,
            user_id="anonymous",
            model="openai/gpt-4o-mini"
        )
        print(f"[Debug] Success! PPT generated at: {filepath}")
    except Exception as e:
        print(f"[Debug] Error occurred: {e}")

if __name__ == "__main__":
    print("[Debug] Running event loop...")
    asyncio.run(main())
