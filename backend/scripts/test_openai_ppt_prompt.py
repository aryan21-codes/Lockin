import os
import sys
import asyncio

from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

from app.services.openai_service import generate_json_response

async def main():
    print("Testing generate_ppt_file system prompt against OpenRouter...")
    system_prompt = '''You are an expert presentation designer creating a professional, university-level presentation.
Topic: "Quantum Computing and Future Technologies"
Total slides: EXACTLY 5

RULES:
1. Use a MIX of these slide types (at least 2 different types):
   - "content": Title + 4-6 bullet points. Each bullet is 1-2 clear sentences with real substance.
   - "visual": Title + 3-4 bullet points + an "image_prompt". The image_prompt must be a SHORT, simple description (under 15 words, e.g. "modern office workspace with dual monitors and coffee").
   - "comparison": Title + "left_points" + "right_points" (3-4 items each). Good for pros/cons, before/after, or two approaches.
   - "quote": A memorable "quote" + "author". Use sparingly (max 1).
   - "hero": Title + Subtitle + an "image_prompt". Perfect for key transitions or section dividers. The image is displayed full-bleed in the background. Use at most 1 hero slide.
   - "stats": Title + a "stats" list (3-4 items). Each stat has a "value" (e.g., "98%", "10x", "50M") and a "label" explaining it. Good for showing metrics, performance, growth, or numbers.
2. Bullet points must be substantive explanations, not vague phrases.
3. Titles must be concise (3-7 words).
4. image_prompt must be SHORT and concrete — no flowery language. Example: "student studying with laptop in library" NOT "A cinematic, breathtakingly detailed ultra-wide photograph of..."
5. IMPORTANT: Generates at most 2 slides in total that require images (meaning the sum of "visual" + "hero" slides must be <= 2) to maintain a fast and high-quality generation.

Respond ONLY with this JSON:
{
    "presentation_title": "Concise Title",
    "slides": [
        {
            "type": "content",
            "title": "Slide Title",
            "points": ["Point 1.", "Point 2."]
        },
        {
            "type": "visual",
            "title": "Slide Title",
            "points": ["Point 1.", "Point 2."],
            "image_prompt": "short concrete image description"
        },
        {
            "type": "comparison",
            "title": "Slide Title",
            "left_points": ["Left 1.", "Left 2."],
            "right_points": ["Right 1.", "Right 2."]
        },
        {
            "type": "quote",
            "quote": "The quote text.",
            "author": "Author Name"
        },
        {
            "type": "hero",
            "title": "Transition or Opener Title",
            "subtitle": "Supporting subtitle message.",
            "image_prompt": "short concrete image description"
        },
        {
            "type": "stats",
            "title": "Key Statistics or Performance Metrics",
            "stats": [
                {"value": "95%", "label": "Satisfied Customers"},
                {"value": "10x", "label": "Growth Rate"},
                {"value": "24/7", "label": "Support Available"}
            ]
        }
    ]
}
'''
    try:
        res = await generate_json_response(
            system_prompt=system_prompt,
            user_prompt="Generate 5 highly detailed slides now.",
            model="openai/gpt-4o-mini",
            max_tokens=6000
        )
        print("Response received successfully:")
        print(res)
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(main())
