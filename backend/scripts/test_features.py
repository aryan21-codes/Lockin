import os
import sys
import asyncio
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, backend_dir)
load_dotenv(os.path.join(backend_dir, '.env'))

from app.services.openai_service import generate_json_response, generate_text_response
from app.services.quiz_service import generate_quiz
from app.services.flashcard_service import generate_flashcards
from app.services.code_explainer_service import generate_code_explanation
from app.services.summarizer import _step1_generate_model_answer

sample_text = """
Photosynthesis is a biological process used by plants, algae, and certain bacteria to convert light energy into chemical energy.
During photosynthesis in green plants, light energy is captured and used to convert water, carbon dioxide, and minerals into oxygen and energy-rich organic compounds such as glucose.
The general chemical equation for oxygenic photosynthesis is: 6 CO2 + 6 H2O + light energy -> C6H12O6 + 6 O2.
Photosynthesis occurs in two main stages: the light-dependent reactions which take place in the thylakoid membranes, and the light-independent reactions (Calvin cycle) which take place in the stroma of the chloroplast.
"""

async def test_text_response():
    print("\n--- Testing Feature 1: generate_text_response (Chat / Assistant) ---")
    res = await generate_text_response(
        system_prompt="You are a helpful study tutor. Give a 1-sentence answer.",
        user_prompt="What is the main byproduct of photosynthesis released into the atmosphere?"
    )
    print(f"Result: {res}")
    assert len(res) > 5, "Response too short"
    print("[PASS] generate_text_response passed.")

async def test_quiz_feature():
    print("\n--- Testing Feature 2: Quiz Generation ---")
    quiz = await generate_quiz(sample_text, num_mcq=2, num_short=1)
    print(f"MCQs generated: {len(quiz.get('mcq', []))}")
    print(f"Short answers generated: {len(quiz.get('short', []))}")
    assert len(quiz.get('mcq', [])) > 0, "No MCQs generated"
    for i, q in enumerate(quiz.get('mcq', [])):
        print(f"  MCQ {i+1}: {q.get('question')}")
        print(f"    Options: {q.get('options')}")
        print(f"    Correct: {q.get('correct')}")
    print("[PASS] Quiz generation passed.")

async def test_flashcards_feature():
    print("\n--- Testing Feature 3: Flashcards Generation ---")
    cards = await generate_flashcards(sample_text, difficulty="medium", user_id="anonymous")
    print(f"Flashcards generated: {len(cards)}")
    assert len(cards) > 0, "No flashcards generated"
    for i, card in enumerate(cards[:2]):
        print(f"  Card {i+1}: Q: {card.get('question')} | A: {card.get('answer')}")
    print("[PASS] Flashcard generation passed.")

async def test_code_explainer_feature():
    print("\n--- Testing Feature 4: Code Explainer ---")
    code_sample = """
    function binarySearch(arr, target) {
        let left = 0, right = arr.length - 1;
        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            if (arr[mid] === target) return mid;
            if (arr[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }
    """
    result = await generate_code_explanation(code_sample, language="javascript", user_id="anonymous")
    explanation_body = result.get("explanation", {})
    summary = explanation_body.get("summary")
    line_by_line = explanation_body.get("line_by_line", [])
    print(f"Summary: {summary}")
    print(f"Lines explained: {len(line_by_line)}")
    assert summary, "Missing summary in code explanation"
    print("[PASS] Code explainer passed.")

async def test_summarizer_feature():
    print("\n--- Testing Feature 5: Smart Notes / Summarizer ---")
    step1 = await _step1_generate_model_answer(sample_text, model="openai/gpt-4o-mini")
    print(f"Topic: {step1.get('topic_title')}")
    print(f"Definition: {step1.get('definition')[:100]}...")
    print(f"Keywords: {step1.get('keywords_identified')}")
    assert step1.get("topic_title"), "No topic title generated"
    print("[PASS] Smart Notes / Summarizer step passed.")

async def main():
    print("=" * 60)
    print("RUNNING END-TO-END FEATURE VERIFICATION")
    print("=" * 60)
    
    passed = 0
    total = 5
    
    tests = [
        ("Text Response", test_text_response),
        ("Quiz Generation", test_quiz_feature),
        ("Flashcards Generation", test_flashcards_feature),
        ("Code Explainer", test_code_explainer_feature),
        ("Summarizer", test_summarizer_feature)
    ]
    
    for name, test_fn in tests:
        try:
            await test_fn()
            passed += 1
        except Exception as e:
            import traceback
            print(f"[FAIL] {name} failed with error: {e}")
            traceback.print_exc()

    print("\n" + "=" * 60)
    print(f"TEST RESULTS: {passed}/{total} FEATURES PASSED")
    print("=" * 60)
    if passed == total:
        print("ALL TESTED FEATURES WORKED FLAWLESSLY!")
    else:
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
