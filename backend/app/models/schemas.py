from pydantic import BaseModel, Field
from typing import Optional, List, Any

# Generic response
class APIResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    message: Optional[str] = None

# Input schemas
class SummarizeRequest(BaseModel):
    text: str

class YoutubeSummarizeRequest(BaseModel):
    url: str

class PPTRequest(BaseModel):
    prompt: str
    num_slides: int = 5

# Todo schemas (retaining from old schema so breaking changes don't occur across system)
class TodoBase(BaseModel):
    title: str
    priority: str = "medium"
    due_date: Optional[str] = None
    completed: bool = False

class TodoCreate(TodoBase):
    pass

class TodoResponse(TodoBase):
    id: str
    user_id: str

# --- Flashcard Schemas ---
class FlashcardGenerateRequest(BaseModel):
    text: str
    difficulty: str = "medium" # easy/medium/hard

class FlashcardResponse(BaseModel):
    id: str
    user_id: Optional[str] = "anonymous"
    question: str
    answer: str
    difficulty: str
    created_at: str

class FlashcardListResponse(BaseModel):
    success: bool
    data: List[FlashcardResponse]
    message: Optional[str] = None

# --- Code Explainer Schemas ---
class CodeExplainerRequest(BaseModel):
    code: str
    language: Optional[str] = "javascript"

class CodeExplanationItem(BaseModel):
    line: str
    explanation: str

class CodeExplainerResponseData(BaseModel):
    summary: str
    line_by_line: List[CodeExplanationItem]
    improvements: List[str]

class CodeExplainerLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = "anonymous"
    code: str
    explanation: CodeExplainerResponseData
    created_at: str

class ChatMessage(BaseModel):
    role: str
    content: str

class CodeChatRequest(BaseModel):
    code: str
    explanation: Any
    history: List[ChatMessage]
    question: str
    mode: Optional[str] = "default"

# --- Exam Intelligence Schemas ---
class TopicImportanceItem(BaseModel):
    name: str
    priority: str
    expected_marks: str
    roi: str

class CategorizedTopics(BaseModel):
    must_do: List[TopicImportanceItem] = []
    should_do: List[TopicImportanceItem] = []
    low_priority: List[TopicImportanceItem] = []

class SmartNoteItem(BaseModel):
    topic: str
    definition: str
    key_concepts: List[str]
    examples: List[str]
    common_mistakes: List[str]
    exam_tips: List[str]
    keywords: List[str]

class QuestionItem(BaseModel):
    question: str
    type: str  # frequently_asked, predicted, variation
    marks: Optional[int] = 5

class ModelAnswerItem(BaseModel):
    question: str
    marks: int = 5
    answer: str  # Full flowing topper-style exam answer
    keywords: List[str] = []
    diagram_suggestions: Optional[str] = None

class StudyPlanItem(BaseModel):
    day_or_block: str
    topic: str
    hours_allocated: str
    focus: str

class ExamIntelligenceResponseData(BaseModel):
    priority_topics: List[TopicImportanceItem] = []
    categorized_topics: CategorizedTopics
    exam_notes: List[SmartNoteItem] = []
    important_questions: List[QuestionItem] = []
    predicted_questions: List[QuestionItem] = []
    model_answers: List[ModelAnswerItem] = []
    quick_revision: List[str] = []
    last_day_revision: List[str] = []
    study_plan: List[StudyPlanItem] = []

class ExamIntelligenceLogResponse(BaseModel):
    id: str
    user_id: str
    results: ExamIntelligenceResponseData
    created_at: str

class GenerateAnswerRequest(BaseModel):
    question: str
    marks: int
    context: Optional[str] = ""

