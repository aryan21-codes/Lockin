"""
Smart Notes Pipeline — 7-Step Topper-Level Exam-Ready Notes Engine
==================================================================
Replaces single-pass summarization with a chained multi-step AI pipeline.
Each step refines and enriches the output of the previous step.

Pipeline:
  1. Generate Model Answer
  2. Structure the Answer
  3. Expand into Smart Notes
  4. Enrich with Examples
  5. Add Exam Elements
  6. Generate Revision Block
  7. Quality Review & Final Assembly
"""

import json
import asyncio
from app.services.openai_service import generate_json_response
from app.utils.chunking import chunk_text
from app.utils.database import log_generation

# ---------------------------------------------------------------------------
# Default model — routed through OpenRouter
# ---------------------------------------------------------------------------
DEFAULT_MODEL = "openai/gpt-4o-mini"
STEP_MAX_TOKENS = 3000


# ===========================================================================
# STEP 1 — Generate Model Answer
# ===========================================================================
async def _step1_generate_model_answer(source_text: str, model: str) -> dict:
    """
    Act as a university examiner. Produce a PERFECT model answer
    that would score full marks on this topic.
    """
    system = """You are a senior university examiner who writes perfect model answers.

Given study material, you must:
1. Identify the CORE topic being discussed.
2. Write a model answer that would score FULL MARKS in an exam.

Structure your answer with:
- Definition (clear, 2-3 sentences)
- Explanation (thorough, covers working principles)
- Example (concrete, relevant)
- Conclusion (ties everything together)

Include important keywords that examiners look for.

You MUST respond with ONLY a valid JSON object:
{
  "topic_title": "The main topic identified from the material",
  "definition": "Clear 2-3 sentence definition",
  "explanation": "Thorough explanation of the concept, 150-250 words",
  "example": "A concrete, relevant example",
  "conclusion": "Strong concluding statement",
  "keywords_identified": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}"""

    return await generate_json_response(
        system,
        f"Generate a perfect model answer from this study material:\n\n{source_text}",
        model=model,
        max_tokens=STEP_MAX_TOKENS,
    )


# ===========================================================================
# STEP 2 — Structure the Answer
# ===========================================================================
async def _step2_structure_answer(step1_output: dict, model: str) -> dict:
    """
    Convert the model answer into clearly organized, bullet-point sections.
    """
    system = """You are an academic content structurer.

Given a model answer, restructure it into clear, scannable sections.
Use bullet points — NO long paragraphs.

You MUST respond with ONLY a valid JSON object:
{
  "title": "Topic title",
  "definition": "Clear, concise definition in 2-3 lines",
  "key_concepts": ["Concept 1: brief explanation", "Concept 2: brief explanation", "Concept 3", "Concept 4", "Concept 5"],
  "structured_explanation": "The explanation reorganized with clear flow, using bullet-style short paragraphs. 150-300 words.",
  "example_summary": "The example from the model answer, clarified and structured"
}

RULES:
- Minimum 5 key_concepts
- Keep definitions under 3 lines
- Break long explanations into digestible chunks
- Preserve all important keywords"""

    return await generate_json_response(
        system,
        f"Structure this model answer into clear sections:\n\n{json.dumps(step1_output, indent=2)}",
        model=model,
        max_tokens=STEP_MAX_TOKENS,
    )


# ===========================================================================
# STEP 3 — Expand into Smart Notes
# ===========================================================================
async def _step3_expand_into_notes(step2_output: dict, source_text: str, model: str) -> dict:
    """
    Expand the structured answer into detailed, exam-focused notes.
    Add exam relevance, types/classification, and working explanation.
    """
    system = """You are an expert academic note-maker who creates topper-level study notes.

Given structured content, EXPAND it into comprehensive exam-ready notes.

Add these dimensions:
1. WHY IMPORTANT — exam relevance and real-world applications
2. TYPES / CLASSIFICATION — if the topic has categories, list them
3. WORKING EXPLANATION — step-by-step how it works (if applicable)

You MUST respond with ONLY a valid JSON object:
{
  "title": "Topic title",
  "definition": "Polished, exam-ready definition",
  "why_important": "Why this topic matters in exams and real-world (2-4 lines)",
  "detailed_explanation": "Comprehensive explanation covering all aspects. Clear, no fluff, exam-focused depth. 200-400 words. Use short paragraphs.",
  "types": [
    {"name": "Type/Category name", "description": "Brief but clear explanation of this type"}
  ],
  "key_concepts": ["Important concept 1 with brief explanation", "Concept 2", "Concept 3", "Concept 4", "Concept 5", "Concept 6"]
}

RULES:
- types array can be empty [] if classification doesn't apply
- Minimum 5 key_concepts
- detailed_explanation must be exam-depth (not surface level)
- why_important must mention exam relevance specifically
- No unnecessary fluff — every sentence must add value"""

    return await generate_json_response(
        system,
        f"Expand these structured notes into comprehensive exam-ready notes.\n\nStructured content:\n{json.dumps(step2_output, indent=2)}\n\nOriginal source (for additional depth):\n{source_text[:3000]}",
        model=model,
        max_tokens=STEP_MAX_TOKENS,
    )


# ===========================================================================
# STEP 4 — Enrich with Examples
# ===========================================================================
async def _step4_enrich_with_examples(step3_output: dict, model: str) -> dict:
    """
    Add concrete examples: code with output for technical topics,
    real-world examples for theory topics.
    """
    system = """You are an expert at creating clear, practical examples for study material.

Given exam-ready notes, ADD rich examples that help students understand AND reproduce in exams.

For TECHNICAL / PROGRAMMING topics:
- Add code examples with correct, runnable code
- Include expected output for each code example
- Explain what the example demonstrates

For THEORY / NON-PROGRAMMING topics:
- Add real-world examples, case studies, or analogies
- Make examples relatable and memorable
- Include scenarios that could appear in exams

You MUST respond with ONLY a valid JSON object:
{
  "examples": [
    {
      "title": "Example title",
      "code": "Complete code example (use empty string if not a coding topic)",
      "output": "Expected output or result",
      "explanation": "What this example demonstrates and why it matters"
    }
  ],
  "syntax": "Key syntax, formula, or pattern to remember (empty string if not applicable)"
}

RULES:
- Generate 2-4 examples minimum
- Code must be syntactically correct and complete
- Output must be accurate
- If theory topic, put the real-world example in 'code' field as descriptive text, and result in 'output'
- Each example must demonstrate a DIFFERENT aspect of the topic"""

    return await generate_json_response(
        system,
        f"Generate rich examples for these notes:\n\n{json.dumps(step3_output, indent=2)}",
        model=model,
        max_tokens=STEP_MAX_TOKENS,
    )


# ===========================================================================
# STEP 5 — Add Exam Elements
# ===========================================================================
async def _step5_add_exam_elements(step3_output: dict, model: str) -> dict:
    """
    Add exam questions, keywords, common mistakes, and answer writing guide.
    """
    system = """You are a university exam preparation expert who has seen thousands of exam papers.

Given exam-ready notes, ADD critical exam elements that help students score maximum marks.

You MUST respond with ONLY a valid JSON object:
{
  "exam_questions": [
    {"question": "Frequently asked exam question", "type": "short_answer"},
    {"question": "Another question", "type": "long_answer"},
    {"question": "MCQ style question", "type": "mcq"}
  ],
  "model_answer": {
    "question": "The single most important exam question on this topic",
    "definition": "Opening definition for the answer (2-3 lines)",
    "explanation": "Core explanation body (100-200 words, structured)",
    "example": "Supporting example to include in answer",
    "conclusion": "Strong closing statement"
  },
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6"],
  "common_mistakes": [
    "Specific mistake students make and why it's wrong",
    "Another common error",
    "Third mistake to avoid"
  ],
  "answer_writing_guide": "Step-by-step guide on how to structure the perfect exam answer for this topic. Include: how to start, what to cover in the body, how to conclude, and what keywords to highlight. 100-200 words."
}

RULES:
- Minimum 4 exam_questions covering short_answer, long_answer, and mcq types
- Minimum 6 keywords
- Minimum 3 common_mistakes (must be specific, not generic)
- model_answer must be detailed enough to directly write in an exam
- answer_writing_guide must be actionable and specific to this topic"""

    return await generate_json_response(
        system,
        f"Add exam elements for these notes:\n\n{json.dumps(step3_output, indent=2)}",
        model=model,
        max_tokens=STEP_MAX_TOKENS,
    )


# ===========================================================================
# STEP 6 — Generate Revision Block
# ===========================================================================
async def _step6_generate_revision_block(step3_output: dict, model: str) -> dict:
    """
    Generate ultra-short revision notes for last-day study.
    """
    system = """You are a revision expert who creates ultra-compact study bullets.

Given detailed notes, create a REVISION BLOCK for last-day exam preparation.

Requirements:
- 5-7 bullet points maximum
- Each bullet must be self-contained (student should understand without context)
- Include the most critical facts, formulas, or definitions
- Use mnemonics or memory aids where possible
- Prioritize what's most likely to appear in exams

You MUST respond with ONLY a valid JSON object:
{
  "revision_notes": [
    "Ultra-short revision bullet 1 — captures a key fact",
    "Bullet 2 — important formula or definition",
    "Bullet 3 — critical concept to remember",
    "Bullet 4 — common exam point",
    "Bullet 5 — quick differentiator or comparison"
  ]
}

RULES:
- Each bullet must be under 30 words
- Must cover the most important points only
- A student reading ONLY these bullets should recall the core topic"""

    return await generate_json_response(
        system,
        f"Generate last-day revision bullets for:\n\n{json.dumps(step3_output, indent=2)}",
        model=model,
        max_tokens=1000,
    )


# ===========================================================================
# STEP 7 — Quality Review & Final Assembly
# ===========================================================================
async def _step7_quality_review(assembled: dict, model: str) -> dict:
    """
    Validate completeness and coherence. Fix gaps if any.
    """
    system = """You are a quality reviewer for academic study materials.

Given a complete set of exam-ready notes, REVIEW and IMPROVE them.

Check:
1. Is the definition clear and exam-ready?
2. Is the explanation complete and structured?
3. Are examples present and correct?
4. Are keywords comprehensive?
5. Is the model answer good enough to score full marks?
6. Are revision notes ultra-compact and useful?

If ANY section is weak, IMPROVE it. If all sections are strong, return them as-is with minor polish.

You MUST respond with ONLY a valid JSON object with these EXACT fields:
{
  "title": "Polished topic title",
  "definition": "Exam-ready definition (2-3 lines)",
  "why_important": "Why this matters for exams (2-4 lines)",
  "detailed_explanation": "Complete, structured explanation (200-400 words)",
  "types": [{"name": "string", "description": "string"}],
  "examples": [{"title": "string", "code": "string", "output": "string", "explanation": "string"}],
  "key_concepts": ["string"],
  "syntax": "Key syntax/formula or empty string",
  "exam_questions": [{"question": "string", "type": "string"}],
  "model_answer": {"question": "string", "definition": "string", "explanation": "string", "example": "string", "conclusion": "string"},
  "keywords": ["string"],
  "common_mistakes": ["string"],
  "answer_writing_guide": "string",
  "revision_notes": ["string"]
}

RULES:
- Return ALL fields — do not drop any
- Improve weak sections, preserve strong ones
- Ensure consistency across all sections
- The final output must be directly usable by a student for exam preparation"""

    return await generate_json_response(
        system,
        f"Quality review and polish these exam-ready notes:\n\n{json.dumps(assembled, indent=2)}",
        model=model,
        max_tokens=4000,
    )


# ===========================================================================
# PIPELINE ORCHESTRATOR
# ===========================================================================
async def generate_smart_notes(
    text: str,
    user_id: str = "anonymous",
    model: str = DEFAULT_MODEL,
    on_step_complete=None,
) -> dict:
    """
    Main entry point — orchestrates the 7-step pipeline.
    
    Args:
        text: Raw study material (from text input or PDF extraction)
        user_id: Supabase user ID for logging
        model: OpenRouter model identifier
        on_step_complete: Optional async callback(step_number, step_name) for progress tracking
    
    Returns:
        Complete structured exam-ready notes dict
    """
    if not text.strip():
        raise ValueError("Cannot generate notes from empty text.")

    # --- Chunk management for very large inputs ---
    chunks = chunk_text(text, chunk_size=80000, overlap=2000)
    source_text = text
    if len(chunks) > 1:
        source_text = "\n...\n".join(chunks[:3])
        print(f"[Smart Notes] Input truncated from {len(text)} to {len(source_text)} chars")

    steps = [
        (1, "Generating model answer"),
        (2, "Structuring answer"),
        (3, "Expanding into smart notes"),
        (4, "Enriching with examples"),
        (5, "Adding exam elements"),
        (6, "Generating revision block"),
        (7, "Quality review"),
    ]

    async def _notify(step_num, step_name):
        print(f"[Smart Notes] Step {step_num}/7: {step_name}")
        if on_step_complete:
            try:
                await on_step_complete(step_num, step_name)
            except Exception:
                pass

    # --- STEP 1: Generate Model Answer ---
    await _notify(1, steps[0][1])
    step1 = await _step1_generate_model_answer(source_text, model)

    # --- STEP 2: Structure the Answer ---
    await _notify(2, steps[1][1])
    step2 = await _step2_structure_answer(step1, model)

    # --- STEP 3: Expand into Smart Notes ---
    await _notify(3, steps[2][1])
    step3 = await _step3_expand_into_notes(step2, source_text, model)

    # --- STEP 4: Enrich with Examples ---
    await _notify(4, steps[3][1])
    step4 = await _step4_enrich_with_examples(step3, model)

    # --- STEP 5: Add Exam Elements ---
    await _notify(5, steps[4][1])
    step5 = await _step5_add_exam_elements(step3, model)

    # --- STEP 6: Generate Revision Block ---
    await _notify(6, steps[5][1])
    step6 = await _step6_generate_revision_block(step3, model)

    # --- STEP 7: Assemble + Quality Review ---
    await _notify(7, steps[6][1])

    # Merge all outputs into one object
    assembled = {
        "title": step3.get("title", step2.get("title", step1.get("topic_title", "Untitled"))),
        "definition": step3.get("definition", step2.get("definition", step1.get("definition", ""))),
        "why_important": step3.get("why_important", ""),
        "detailed_explanation": step3.get("detailed_explanation", step2.get("structured_explanation", "")),
        "types": step3.get("types", []),
        "examples": step4.get("examples", []),
        "key_concepts": step3.get("key_concepts", step2.get("key_concepts", [])),
        "syntax": step4.get("syntax", ""),
        "exam_questions": step5.get("exam_questions", []),
        "model_answer": step5.get("model_answer", {}),
        "keywords": step5.get("keywords", step1.get("keywords_identified", [])),
        "common_mistakes": step5.get("common_mistakes", []),
        "answer_writing_guide": step5.get("answer_writing_guide", ""),
        "revision_notes": step6.get("revision_notes", []),
    }

    # Quality review pass
    try:
        final = await _step7_quality_review(assembled, model)
    except Exception as e:
        print(f"[Smart Notes] Quality review failed, using assembled output: {e}")
        final = assembled

    # Add pipeline metadata
    final["pipeline_metadata"] = {
        "steps_completed": 7,
        "model": model,
    }

    # --- Log to Supabase ---
    log_generation(user_id=user_id, content_type="smart_notes", content_data=final)

    return final


# ===========================================================================
# BACKWARD COMPATIBILITY ALIAS
# ===========================================================================
async def generate_summary(text: str, user_id: str = "anonymous", model: str = DEFAULT_MODEL) -> dict:
    """
    Legacy alias — now redirects to the full Smart Notes pipeline.
    Kept for backward compatibility with existing route imports.
    """
    return await generate_smart_notes(text, user_id=user_id, model=model)
