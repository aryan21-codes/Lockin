import asyncio
import json
from typing import List, Dict, Any, Optional
from app.services.openai_service import generate_json_response
from app.utils.chunking import chunk_text
from app.utils.pdf_parser import extract_text_from_pdf

class ExamIntelligencePipeline:
    """
    Orchestrates the 5-module Exam Intelligence system.
    """

    def __init__(self, user_id: str, model: str = "openai/gpt-4o-mini"):
        self.user_id = user_id
        self.model = model

    async def run(self, files_data: List[Dict[str, Any]], time_available: str) -> dict:
        """
        Executes the exam intelligence pipeline.
        files_data: List of dicts like {"filename": str, "content": bytes, "type": str ("notes"|"pyq"|"question_bank")}
        """
        # Module 1: INPUT PROCESSOR
        print("[Exam Intel] Module 1: Input Processor")
        processed_data = await self._step_input_processor(files_data)

        if not processed_data.get('notes') and not processed_data.get('pyq') and not processed_data.get('question_bank'):
            raise ValueError("No readable text found in uploads.")

        # Prepare combined text summaries to pass around
        notes_text = "\n".join(processed_data['notes'])[:40000] # Safe limit
        pyq_text = "\n".join(processed_data['pyq'])[:20000]
        qb_text = "\n".join(processed_data['question_bank'])[:20000]

        # Generate combined full context carefully
        context_preview = f"--- NOTES ---\n{notes_text[:10000]}\n--- PYQs ---\n{pyq_text[:10000]}\n--- Q-BANK ---\n{qb_text[:10000]}"

        # Module 2: IMPORTANCE ENGINE
        print("[Exam Intel] Module 2: Importance Engine")
        importance_result = await self._step_importance_engine(context_preview)
        
        priority_topics = []
        if "categorized_topics" in importance_result:
            priority_topics.extend(importance_result["categorized_topics"].get("must_do", []))
            priority_topics.extend(importance_result["categorized_topics"].get("should_do", []))

        # We will extract priority topic names for the content generation
        top_topic_names = [topic.get("name") for topic in priority_topics][:8] # Cap at top 8 to save tokens

        # Module 3: CONTENT GENERATOR
        print("[Exam Intel] Module 3: Content Generator")
        notes_result = await self._step_content_generator(notes_text, top_topic_names)

        # Module 4: QUESTION ENGINE
        print("[Exam Intel] Module 4: Question Engine")
        questions_result = await self._step_question_engine(pyq_text, qb_text, top_topic_names)

        # Module 5 & 6 & 7: ANSWER, REVISION, STUDY OPTIMIZER (Combined or Sequential)
        print("[Exam Intel] Modules 5, 6, 7: Answers & Optimization")
        
        important_q_list = questions_result.get("important_questions", [])[:5] # Take top 5 for detailed answers
        
        # Pass marks info from questions to the answer engine
        answers_result = await self._step_answer_engine(notes_text, important_q_list)
        revision_result = await self._step_revision_optimizer(notes_text, top_topic_names, time_available)

        return {
            "priority_topics": priority_topics,
            "categorized_topics": importance_result.get("categorized_topics", {"must_do": [], "should_do": [], "low_priority": []}),
            "exam_notes": notes_result.get("exam_notes", []),
            "important_questions": questions_result.get("important_questions", []),
            "predicted_questions": questions_result.get("predicted_questions", []),
            "model_answers": answers_result.get("model_answers", []),
            "quick_revision": revision_result.get("quick_revision", []),
            "last_day_revision": revision_result.get("last_day_revision", []),
            "study_plan": revision_result.get("study_plan", []),
            "source_files": [f["filename"] for f in files_data],
        }

    async def _step_input_processor(self, files_data: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """Extract and categorize texts based on file type."""
        processed = {
            "notes": [],
            "pyq": [],
            "question_bank": []
        }
        for file_obj in files_data:
            content_bytes = file_obj['content']
            ext = file_obj['filename'].lower().split('.')[-1]
            cat = file_obj['type'] # "notes", "pyq", "question_bank"
            
            text = ""
            if ext == "pdf":
                text = extract_text_from_pdf(content_bytes)
            else:
                try:
                    text = content_bytes.decode("utf-8")
                except:
                    text = content_bytes.decode("latin-1")
            
            if text and cat in processed:
                processed[cat].append(text)
                
        return processed

    async def _step_importance_engine(self, context_text: str) -> dict:
        sys_prompt = """You are an expert exam analyzer based on the 80/20 principle.
You analyze notes, Past Year Questions (PYQs), and Question Banks to determine high-scoring topics.

Return ONLY a strictly formatted JSON:
{
  "categorized_topics": {
    "must_do": [
      {"name": "Topic", "priority": "high", "expected_marks": "10", "roi": "high"}
    ],
    "should_do": [],
    "low_priority": []
  }
}
Aim for 3-5 MUST DO, 4-6 SHOULD DO, and group the rest in LOW PRIORITY."""
        
        return await generate_json_response(sys_prompt, f"Analyze this material:\n\n{context_text}", model=self.model, max_tokens=1500)

    async def _step_content_generator(self, notes_text: str, top_topics: List[str]) -> dict:
        if not top_topics:
            return {"exam_notes": []}
            
        sys_prompt = """Generate 'Smart Notes' ONLY for the provided high-priority topics based on the syllabus context.
Each note must be heavily structured for rapid memorization and exam performance.

Return ONLY a strictly formatted JSON:
{
  "exam_notes": [
    {
      "topic": "Topic Name",
      "definition": "Clear 2-3 line definition",
      "key_concepts": ["Concept 1", "Concept 2"],
      "examples": ["Example 1"],
      "common_mistakes": ["Don't confuse X with Y"],
      "exam_tips": ["Always draw a diagram here"],
      "keywords": ["Term1", "Term2"]
    }
  ]
}"""
        prompt = f"Focus Topics: {', '.join(top_topics)}\n\nContext:\n{notes_text[:20000]}"
        return await generate_json_response(sys_prompt, prompt, model=self.model, max_tokens=2500)

    async def _step_question_engine(self, pyq_text: str, qb_text: str, top_topics: List[str]) -> dict:
        sys_prompt = """Analyze past patterns and question banks. Predict questions for the upcoming exam.
For each question, estimate the marks it would carry based on complexity and typical exam patterns:
- 2 marks: Definition or one-liner questions
- 5 marks: Short-answer questions requiring explanation
- 10 marks: Medium-length questions with examples
- 15-20 marks: Long-answer/essay questions requiring comprehensive coverage

Return ONLY structured JSON:
{
  "important_questions": [{"question": "Q text", "type": "frequently_asked", "marks": 10}],
  "predicted_questions": [{"question": "Predicted Q text", "type": "predicted", "marks": 5}]
}
Include at least 5 important and 3 predicted questions."""
        
        prompt = f"Target Topics: {', '.join(top_topics)}\n\nPYQs:\n{pyq_text}\n\nQ-Bank:\n{qb_text}"
        return await generate_json_response(sys_prompt, prompt[:25000], model=self.model, max_tokens=1500)

    async def _step_answer_engine(self, notes_text: str, questions: List[dict]) -> dict:
        if not questions:
            return {"model_answers": []}
            
        # Build question list with marks for the prompt
        q_data = []
        for q in questions:
            q_data.append({
                "question": q.get("question", ""),
                "marks": q.get("marks", 10)
            })

        sys_prompt = """You are a UNIVERSITY GOLD MEDALIST and EXAM TOPPER. You write model answers that consistently score 95%+ marks in university exams.

Your task: Write COMPLETE, EXAM-READY model answers that students can memorize and write AS-IS in their exams to score full marks.

CRITICAL RULES FOR MARKS-BASED LENGTH:
- 2 marks: 3-4 lines. Just a crisp definition with one key point. (1 paragraph)
- 5 marks: 8-12 lines (roughly 150-200 words). Definition + brief explanation + one example. (2-3 paragraphs)
- 10 marks: 20-30 lines (roughly 350-500 words). Full coverage with 4-5 paragraphs.
- 15 marks: 35-45 lines (roughly 500-700 words). Comprehensive answer with 5-7 paragraphs.
- 20 marks: 50-60 lines (roughly 700-1000 words). Essay-level with 7-9 paragraphs.

PARAGRAPH FORMATTING (VERY IMPORTANT):
- You MUST separate paragraphs using "\\n\\n" (double newline) inside the answer string.
- Structure every answer as multiple clear paragraphs:
  * Paragraph 1: Opening definition/introduction
  * Paragraph 2-N: Each major point or concept gets its own paragraph
  * Final paragraph: Conclusion/summary
- NEVER write the entire answer as one continuous block of text. This is CRITICAL.
- Example format for the answer field: "First paragraph about definition.\\n\\nSecond paragraph explaining concept A in detail.\\n\\nThird paragraph with examples.\\n\\nConclusion paragraph."

WRITING STYLE:
- Write in the FIRST PERSON as a confident student writing in an exam
- Use natural paragraph flow — NOT bullet points unless listing items
- Start with a strong opening definition/introduction
- Include technical depth and accuracy throughout
- Give REAL examples with names, technologies, or scenarios — not generic "for example, X"
- Mention key terms/definitions that examiners look for (these score marks)
- End with a solid concluding statement
- If the topic has sub-parts (like "four pillars of OOP"), cover EACH sub-part thoroughly
- Make the answer SELF-CONTAINED — a student should need NOTHING else to score full marks

IMPORTANT:
- Each answer must be PROPORTIONAL to its marks. A 20-mark answer must be 4x longer than a 5-mark answer.
- DO NOT pad with fluff. Every sentence must add exam-scoring value.
- Include the kind of depth that makes examiners give FULL marks.

Return ONLY valid JSON:
{
  "model_answers": [
    {
      "question": "The exact question",
      "marks": 10,
      "answer": "Opening definition paragraph.\\n\\nDetailed explanation paragraph.\\n\\nExample paragraph with real scenarios.\\n\\nConclusion paragraph.",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "diagram_suggestions": "Draw a labeled diagram showing... (or null if not needed)"
    }
  ]
}"""
        prompt = f"Questions to answer (with marks):\n{json.dumps(q_data, indent=2)}\n\nReference Material (use this for technical accuracy):\n{notes_text[:25000]}"
        return await generate_json_response(sys_prompt, prompt, model=self.model, max_tokens=8000)

    async def _step_revision_optimizer(self, notes_text: str, topics: List[str], time_available: str) -> dict:
        sys_prompt = """You are a strategic study planner. Create a revision sheet and a highly optimized time-based study plan based on the 80/20 rule.
Return strictly formatted JSON:
{
  "quick_revision": ["Ultra short fact 1", "Fact 2"],
  "last_day_revision": ["Crucial priority point 1", "Formula 2"],
  "study_plan": [
    {"day_or_block": "Day 1 / Morning", "topic": "Name", "hours_allocated": "2h", "focus": "PYQ solving"}
  ]
}"""
        prompt = f"Time Available: {time_available}\nTopics to cover: {', '.join(topics)}\n\nContext:\n{notes_text[:10000]}"
        return await generate_json_response(sys_prompt, prompt, model=self.model, max_tokens=2000)

async def run_exam_intelligence_pipeline(user_id: str, files_data: List[Dict[str, Any]], time_available: str, model: str = "openai/gpt-4o-mini") -> dict:
    pipeline = ExamIntelligencePipeline(user_id=user_id, model=model)
    return await pipeline.run(files_data, time_available)
