import os
from supabase import create_client, Client
from app.utils.config import settings
import uuid
from datetime import datetime

def get_supabase(access_token: str = None) -> Client:
    """
    Returns a Supabase client. If access_token is provided,
    sets it on the PostgREST client so auth.uid() works with RLS.
    """
    try:
        supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        if access_token:
            supabase.postgrest.auth(access_token)
        return supabase
    except Exception as e:
        print(f"Error initializing Supabase client: {e}")
        return None

def log_generation(user_id: str, content_type: str, content_data: dict, title: str = None, prompt: str = None, youtube_url: str = None, access_token: str = None):
    """
    Logs generated content to Supabase table `content_generations`.
    Stores title, prompt, and youtube_url inside the JSONB 'content' column.
    """
    client = get_supabase(access_token)
    if not client: return
    
    try:
        # Merge extra metadata into content_data JSONB since table only has: id, user_id, content_type, content, created_at
        enriched_content = dict(content_data)
        if title:
            enriched_content["title"] = title
        if prompt:
            enriched_content["prompt"] = prompt
        if youtube_url:
            enriched_content["youtube_url"] = youtube_url
            
        record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id, 
            "content_type": content_type,
            "content": enriched_content,
            "created_at": datetime.utcnow().isoformat()
        }
        client.table("content_generations").insert(record).execute()
        print(f"Logged {content_type} generation to Supabase.")
    except Exception as e:
        print(f"[Supabase Sync Non-Fatal Error]: {e} (Have you created the `content_generations` table?)")

# --- Flashcards Helpers ---
def save_flashcards(user_id: str, flashcards: list, access_token: str = None):
    client = get_supabase(access_token)
    if not client: return []
    
    records = []
    for fc in flashcards:
        records.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "question": fc.get("question"),
            "answer": fc.get("answer"),
            "difficulty": fc.get("difficulty"),
            "created_at": datetime.utcnow().isoformat()
        })
    try:
        if records:
            result = client.table("flashcards").insert(records).execute()
            return result.data
    except Exception as e:
        print(f"[Supabase Error - flashcards]: {e}")
    return []

def get_flashcards(user_id: str, access_token: str = None):
    client = get_supabase(access_token)
    if not client: return []
    try:
        result = client.table("flashcards").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return result.data
    except Exception as e:
        print(f"[Supabase Error - flashcards GET]: {e}")
    return []

def delete_flashcard(id: str, access_token: str = None):
    client = get_supabase(access_token)
    if not client: return False
    try:
        client.table("flashcards").delete().eq("id", id).execute()
        return True
    except Exception as e:
        print(f"[Supabase Error - flashcards DELETE]: {e}")
    return False

def delete_all_flashcards(user_id: str, access_token: str = None):
    client = get_supabase(access_token)
    if not client: return False
    try:
        client.table("flashcards").delete().eq("user_id", user_id).execute()
        return True
    except Exception as e:
        print(f"[Supabase Error - flashcards DELETE ALL]: {e}")
    return False

# --- Code Explainer Helpers ---
def save_code_explanation(user_id: str, code: str, explanation: dict, access_token: str = None):
    client = get_supabase(access_token)
    if not client: return None
    try:
        record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "code": code,
            "explanation": explanation,
            "created_at": datetime.utcnow().isoformat()
        }
        result = client.table("code_explanations").insert(record).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[Supabase Error - code_explanations]: {e}")
    return None

def get_code_explanations(user_id: str, access_token: str = None):
    client = get_supabase(access_token)
    if not client: return []
    try:
        result = client.table("code_explanations").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return result.data
    except Exception as e:
        print(f"[Supabase Error - code_explanations GET]: {e}")
    return []

# --- Todos Helpers ---
def save_todo(user_id: str, title: str, priority: str, due_date: str, access_token: str = None):
    client = get_supabase(access_token)
    if not client: return None
    try:
        record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": title,
            "priority": priority,
            "due_date": due_date,
            "completed": False,
        }
        result = client.table("todos").insert(record).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[Supabase Error - todos insert]: {e}")
    return None

def get_todos(user_id: str, access_token: str = None):
    client = get_supabase(access_token)
    if not client: return []
    try:
        result = client.table("todos").select("*").eq("user_id", user_id).execute()
        return result.data
    except Exception as e:
        print(f"[Supabase Error - todos GET]: {e}")
    return []

def update_todo(todo_id: str, updates: dict, access_token: str = None):
    client = get_supabase(access_token)
    if not client: return None
    try:
        result = client.table("todos").update(updates).eq("id", todo_id).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[Supabase Error - todos UPDATE]: {e}")
    return None

def delete_todo(todo_id: str, access_token: str = None):
    client = get_supabase(access_token)
    if not client: return False
    try:
        client.table("todos").delete().eq("id", todo_id).execute()
        return True
    except Exception as e:
        print(f"[Supabase Error - todos DELETE]: {e}")
    return False

# --- Dashboard Helpers ---
def get_dashboard_stats(user_id: str, access_token: str = None):
    client = get_supabase(access_token)
    if not client: 
        return {"notes_count": 0, "videos_count": 0, "ppt_count": 0, "flashcards_count": 0, "tasks_completed": 0}
    try:
        # Notes
        notes = client.table("content_generations").select("id", count="exact").eq("user_id", user_id).eq("content_type", "notes").execute()
        notes_count = notes.count if notes.count is not None else 0

        # Videos
        videos = client.table("content_generations").select("id", count="exact").eq("user_id", user_id).eq("content_type", "videos").execute()
        videos_count = videos.count if videos.count is not None else 0

        # PPT
        ppt = client.table("content_generations").select("id", count="exact").eq("user_id", user_id).eq("content_type", "ppt").execute()
        ppt_count = ppt.count if ppt.count is not None else 0

        # Flashcards
        flashcards = client.table("flashcards").select("id", count="exact").eq("user_id", user_id).execute()
        flashcards_count = flashcards.count if flashcards.count is not None else 0

        # Tasks completed
        tasks = client.table("todos").select("id", count="exact").eq("user_id", user_id).eq("completed", True).execute()
        tasks_completed = tasks.count if tasks.count is not None else 0

        return {
            "notes_count": notes_count,
            "videos_count": videos_count,
            "ppt_count": ppt_count,
            "flashcards_count": flashcards_count,
            "tasks_completed": tasks_completed
        }
    except Exception as e:
        print(f"[Supabase Error - Dashboard API]: {e}")
        return {"notes_count": 0, "videos_count": 0, "ppt_count": 0, "flashcards_count": 0, "tasks_completed": 0}

def get_recent_activity(user_id: str, access_token: str = None):
    client = get_supabase(access_token)
    if not client: return []
    try:
        activities = []
        # Get recent generations
        gens = client.table("content_generations").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(5).execute()
        for g in gens.data:
            if g['content_type'] == 'notes': title = "Generated Notes Summary"
            elif g['content_type'] == 'videos': title = "Summarized YouTube Video"
            elif g['content_type'] == 'ppt': title = "Generated PPT Presentation"
            else: title = "Generated Content"
            activities.append({"id": g['id'], "title": title, "created_at": g['created_at'], "type": "generation"})
            
        # Sort and return top 5
        activities.sort(key=lambda x: x['created_at'], reverse=True)
        return activities[:5]
    except Exception as e:
        print(f"[Supabase Error - Activity GET]: {e}")
    return []

# --- Workflow Helpers ---
def save_workflow_result(user_id: str, source_file: str, result_data: dict, access_token: str = None):
    """
    Stores a full workflow pipeline result in content_generations table.
    Uses content_type='workflow' and stores everything in the JSONB content column.
    """
    client = get_supabase(access_token)
    if not client: return None
    try:
        record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "content_type": "workflow",
            "content": {
                "source_file": source_file,
                "summary": result_data.get("summary", ""),
                "key_points": result_data.get("key_points", []),
                "flashcards": result_data.get("flashcards", []),
                "quiz": result_data.get("quiz", {}),
                "text_length": result_data.get("text_length", 0),
                "steps_completed": result_data.get("steps_completed", 0),
                "title": f"AI Workflow: {source_file}",
            },
            "created_at": datetime.utcnow().isoformat()
        }
        result = client.table("content_generations").insert(record).execute()
        print(f"[Workflow] Saved pipeline result for {source_file}")
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[Supabase Error - workflow save]: {e}")
    return None

def get_workflow_results(user_id: str, access_token: str = None):
    """Retrieves past workflow pipeline runs for a user."""
    client = get_supabase(access_token)
    if not client: return []
    try:
        result = client.table("content_generations") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("content_type", "workflow") \
            .order("created_at", desc=True) \
            .limit(20) \
            .execute()
        return result.data
    except Exception as e:
        print(f"[Supabase Error - workflow GET]: {e}")
    return []

# --- Exam Intelligence Helpers ---
def save_exam_intelligence_result(user_id: str, result_data: dict, access_token: str = None):
    """
    Stores a full exam intelligence pipeline result in content_generations table.
    """
    client = get_supabase(access_token)
    if not client: return None
    try:
        record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "content_type": "exam_intelligence",
            "content": result_data,
            "created_at": datetime.utcnow().isoformat()
        }
        result = client.table("content_generations").insert(record).execute()
        print(f"[Exam Intelligence] Saved pipeline result for user {user_id}")
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[Supabase Error - exam_intelligence save]: {e}")
    return None

def get_exam_intelligence_results(user_id: str, access_token: str = None):
    """Retrieves past exam intelligence runs for a user."""
    client = get_supabase(access_token)
    if not client: return []
    try:
        result = client.table("content_generations") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("content_type", "exam_intelligence") \
            .order("created_at", desc=True) \
            .limit(20) \
            .execute()
        return result.data
    except Exception as e:
        print(f"[Supabase Error - exam_intelligence GET]: {e}")
    return []

