import asyncio
from typing import Callable, Optional
from app.services.openai_service import generate_json_response
from app.services.quiz_service import generate_quiz
from app.utils.chunking import chunk_text
from app.utils.pdf_parser import extract_text_from_pdf


class WorkflowPipeline:
    """
    Orchestrates the full study pipeline:
      Step 1: Extract text from PDF/TXT
      Step 2: Generate summary + key points
      Step 3: Generate flashcards
      Step 4: Generate quiz (MCQ + short)

    Each step is modular and reusable. The pipeline feeds
    extracted text into all 3 AI steps sequentially.
    """

    def __init__(self, user_id: str, filename: str, model: str = "openai/gpt-4o-mini"):
        self.user_id = user_id
        self.filename = filename
        self.model = model
        self.steps = [
            {"id": "extract", "label": "Extracting text"},
            {"id": "summarize", "label": "Generating summary"},
            {"id": "flashcards", "label": "Generating flashcards"},
            {"id": "quiz", "label": "Creating quiz"},
        ]

    async def run(self, file_bytes: bytes, file_ext: str) -> dict:
        """
        Executes the full pipeline and returns structured results.
        """
        # Step 1: Extract text
        print(f"[Workflow] Step 1/4: Extracting text from {self.filename}")
        text = await self._step_extract(file_bytes, file_ext)

        if not text or len(text.strip()) < 50:
            raise ValueError("Extracted text is too short to process. Please upload a document with more content.")

        # Step 2: Summarize
        print(f"[Workflow] Step 2/4: Generating summary")
        summary_result = await self._step_summarize(text)

        # Step 3: Flashcards
        print(f"[Workflow] Step 3/4: Generating flashcards")
        flashcards_result = await self._step_flashcards(text)

        # Step 4: Quiz
        print(f"[Workflow] Step 4/4: Creating quiz")
        quiz_result = await self._step_quiz(text)

        print(f"[Workflow] Pipeline complete for {self.filename}")

        return {
            "source_file": self.filename,
            "summary": summary_result.get("summary", ""),
            "key_points": summary_result.get("key_points", []),
            "flashcards": flashcards_result,
            "quiz": quiz_result,
            "text_length": len(text),
            "steps_completed": 4,
        }

    # ────────────────────────────────────────────
    #  MODULAR PIPELINE STEPS
    # ────────────────────────────────────────────

    async def _step_extract(self, file_bytes: bytes, file_ext: str) -> str:
        """Step 1: Extract raw text from file."""
        if file_ext == ".pdf":
            return extract_text_from_pdf(file_bytes)
        else:
            # Plain text files (.txt, .md, etc.)
            try:
                return file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                return file_bytes.decode("latin-1")

    async def _step_summarize(self, text: str) -> dict:
        """Step 2: Generate summary + key points via OpenAI."""
        chunks = chunk_text(text, chunk_size=80000, overlap=2000)
        combined = text if len(chunks) == 1 else "\n...\n".join(chunks[:3])

        system_prompt = """You are an expert academic assistant reading technical notes and coursework.
Your objective is to extract the main themes safely and accurately.
Output ONLY a JSON object that carefully matches this exact structure:
{
  "summary": "A rich, detailed paragraph summarizing the material (150-300 words)",
  "key_points": ["Detailed bullet 1", "Detailed bullet 2", "Detailed bullet 3", "Detailed bullet 4", "Detailed bullet 5"]
}
Generate at least 5 key points. Each key point should be a complete, standalone insight."""

        return await generate_json_response(
            system_prompt,
            f"Please summarize this study material:\n\n{combined}",
            model=self.model,
            max_tokens=2000
        )

    async def _step_flashcards(self, text: str) -> list:
        """Step 3: Generate flashcards via OpenAI."""
        chunks = chunk_text(text, chunk_size=80000, overlap=1000)
        combined = text if len(chunks) == 1 else "\n...\n".join(chunks[:3])

        system_prompt = """You are an expert academic tutor.
Your task is to generate medium-difficulty flashcards from the provided study material.
Extract the most important core concepts, definitions, formulas, and rules.
Output ONLY a JSON object that strictly matches this structure:
{
  "flashcards": [
    {
      "question": "Clear, standalone question testing a specific concept",
      "answer": "Concise, accurate answer",
      "difficulty": "medium"
    }
  ]
}
Generate between 8 and 15 highly effective flashcards. Ensure all questions make sense out of context."""

        response = await generate_json_response(
            system_prompt,
            f"Material to process:\n\n{combined}",
            model=self.model,
            max_tokens=2500
        )

        return response.get("flashcards", [])

    async def _step_quiz(self, text: str) -> dict:
        """Step 4: Generate quiz questions via dedicated service."""
        return await generate_quiz(text, num_mcq=5, num_short=3, model=self.model)


async def run_study_pipeline(
    user_id: str,
    filename: str,
    file_bytes: bytes,
    file_ext: str,
    model: str = "openai/gpt-4o-mini"
) -> dict:
    """
    Public entry point for the workflow pipeline.
    Creates a pipeline instance and runs all steps.
    """
    pipeline = WorkflowPipeline(user_id=user_id, filename=filename, model=model)
    return await pipeline.run(file_bytes, file_ext)
