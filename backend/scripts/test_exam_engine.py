import os
import sys
import time
import asyncio
from dotenv import load_dotenv

# Add backend directory to path
backend_dir = r'c:\Users\ultra\Downloads\SIGMA WEB DEV\Lockin\backend'
sys.path.insert(0, backend_dir)

# Load env variables
load_dotenv(os.path.join(backend_dir, '.env'))

from app.services.exam_intelligence_service import ExamIntelligencePipeline

async def test_pipeline():
    sample_notes = """
    React is a popular JavaScript library for building user interfaces, developed by Facebook.
    It utilizes a Virtual DOM to optimize rendering performance by only updating parts of the real DOM that have changed.
    Key concepts include:
    1. Components: The building blocks of React applications, which can be functional or class-based.
    2. Props: Read-only inputs passed to components to configure them.
    3. State: Mutable data managed within a component that triggers re-rendering when updated.
    4. Lifecycle methods/Hooks: Functions like useEffect that run at specific stages of component life.
    
    React components use JSX, a syntax extension that looks like HTML inside JavaScript.
    State management can be handled using local state, Context API, or external libraries like Redux or Zustand.
    """
    
    sample_pyq = """
    1. Explain the difference between Props and State in React. (5 marks)
    2. What is the Virtual DOM and how does React use it to optimize rendering? (10 marks)
    """
    
    sample_qb = """
    1. Describe React Hooks and explain useState and useEffect. (10 marks)
    2. Compare Functional Components and Class Components in React. (5 marks)
    """

    files_data = [
        {"filename": "react_notes.txt", "content": sample_notes.encode('utf-8'), "type": "notes"},
        {"filename": "react_pyq.txt", "content": sample_pyq.encode('utf-8'), "type": "pyq"},
        {"filename": "react_qb.txt", "content": sample_qb.encode('utf-8'), "type": "question_bank"},
    ]

    pipeline = ExamIntelligencePipeline(user_id="test_user")

    print("--- STARTING NEW OPTIMIZED CONCURRENT PIPELINE SPEED TEST ---")
    
    start_time = time.time()
    
    result = await pipeline.run(files_data, "3 days")
    
    total_time = time.time() - start_time
    print(f"\nTOTAL PIPELINE TIME (CONCURRENT & COMBINED): {total_time:.2f}s")
    
    print("\nResults summary:")
    print(f"Priority Topics: {[t.get('name') for t in result.get('priority_topics', [])]}")
    print(f"Notes generated: {len(result.get('exam_notes', []))}")
    print(f"Questions predicted: {len(result.get('predicted_questions', []))}")
    print(f"Questions important: {len(result.get('important_questions', []))}")
    print(f"Model answers: {len(result.get('model_answers', []))}")
    print(f"Study plan entries: {len(result.get('study_plan', []))}")
    print(f"Quick revision facts: {len(result.get('quick_revision', []))}")

if __name__ == "__main__":
    asyncio.run(test_pipeline())
