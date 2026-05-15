import asyncio
from core.ai_service import generate_summary, generate_ppt_slides

async def test():
    print("Testing generate_summary...")
    summary = await generate_summary("The quick brown fox jumps over the lazy dog. It was a sunny day.")
    print("Summary Output:", summary)
    
    # Do not call PPT slides to save user's prompt tokens unnecessarily, but summary works as validation of library syntax
    
if __name__ == "__main__":
    asyncio.run(test())
