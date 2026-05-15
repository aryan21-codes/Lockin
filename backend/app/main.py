from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import youtube, ppt, todos, summarize, flashcards, code_explainer, dashboard, history, workflow, brain, exam_intelligence, sticky_notes

app = FastAPI(
    title="Student Productivity Hub API",
    description="Enterprise API with OpenAI and Supabase Integration",
    version="2.0.0"
)

import os

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(youtube.router)
app.include_router(ppt.router)
app.include_router(todos.router)
app.include_router(summarize.router)
app.include_router(flashcards.router)
app.include_router(code_explainer.router)
app.include_router(dashboard.router)
app.include_router(history.router)
app.include_router(workflow.router)
app.include_router(brain.router)
app.include_router(exam_intelligence.router)
app.include_router(sticky_notes.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Student Productivity Hub API v2.0 (OpenAI Powered)"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "ai_integration": "active"}
