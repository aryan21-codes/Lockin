import asyncio
import os
import sys

# Ensure app is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.ppt_service import generate_ppt_file

async def main():
    try:
        print("Starting PPT Generation (Gamma-Level Test)...")
        filepath = await generate_ppt_file("A presentation about the future of AI", 4)
        print(f"Success! PPT generated at: {filepath}")
        if os.path.exists(filepath):
            print("Verified: File physically exists on disk.")
            size = os.path.getsize(filepath)
            print(f"File size: {size} bytes")
        else:
            print("Error: File does not exist on disk!")
    except Exception as e:
        print(f"Error occurred during generation: {e}")

if __name__ == "__main__":
    asyncio.run(main())
