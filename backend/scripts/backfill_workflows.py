import os
import sys
import asyncio
from datetime import datetime, timedelta
from jose import jwt

# Add the backend root to the python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils.config import settings
from app.utils.database import get_supabase
from app.services.ingestion_service import ingest_workflow_result

def create_synthetic_token(user_id: str) -> str:
    secret = settings.SUPABASE_JWT_SECRET.strip('"').strip("'")
    # For supabase RLS to work, aud and role must be "authenticated"
    payload = {
        "sub": user_id,
        "aud": "authenticated",
        "role": "authenticated",
        "exp": int((datetime.utcnow() + timedelta(hours=1)).timestamp())
    }
    return jwt.encode(payload, secret, algorithm="HS256")

async def backfill():
    print("=" * 60)
    print("BACKFILL: Populating Second Brain from Past Workflows")
    print("=" * 60)
    
    client = get_supabase()
    if not client:
        print("✗ Could not connect to Supabase.")
        return

    try:
        # Check if tables exist
        try:
            client.table("knowledge_nodes").select("id").limit(1).execute()
            print("[OK] Second Brain tables exist.")
        except Exception as e:
            print(f"[ERROR] Database Error: Second Brain tables do not exist!")
            print(f"  Please run the SQL migration in migrations/second_brain.sql first.")
            return

        # Fetch all workflow histories (from content_generations where content_type='workflow')
        # Note: Depending on how the workflows are stored, we might just query the content_generations table
        print("\nFetching past workflow runs...")
        result = client.table("content_generations") \
            .select("*") \
            .eq("content_type", "workflow") \
            .execute()
        
        records = result.data or []
        print(f"Found {len(records)} past workflow runs.")
        
        success_count = 0
        skip_count = 0
        error_count = 0

        for record in records:
            user_id = record.get("user_id")
            source_url = record.get("source_url") or "Historical Workflow"
            content = record.get("content")
            
            # The workflow output is stored in the content dict. 
            # We need to construct a standard workflow_result dict
            if not content or not isinstance(content, dict):
                print(f"  [SKIP] Record {record.get('id')} has no valid content dict.")
                skip_count += 1
                continue
                
            workflow_result = content
            
            # Since these are historical, we check if they already exist in embeddings to avoid dupes?
            # actually ingest_content handles node/edge upsert, but embeddings are always inserted.
            # a simple check: see if embeddings exist for this source
            existing = client.table("knowledge_embeddings") \
                .select("id") \
                .eq("user_id", user_id) \
                .eq("source_type", "workflow") \
                .eq("source_id", source_url) \
                .limit(1) \
                .execute()
                
            if existing.data and len(existing.data) > 0:
                print(f"  [SKIP] Workflow '{source_url}' is already ingested.")
                skip_count += 1
                continue

            print(f"  [INGESTING] Workflow '{source_url}' for user {user_id}...")
            try:
                # Generate a temporary access token for this user so RLS lets us insert
                token = create_synthetic_token(user_id)
                
                # Trigger ingestion
                await ingest_workflow_result(
                    user_id=user_id,
                    workflow_result=workflow_result,
                    access_token=token
                )
                success_count += 1
                print(f"    [OK] Success.")
            except Exception as e:
                print(f"    [ERROR] Error: {e}")
                error_count += 1

        print("\n" + "=" * 60)
        print(f"DONE. Success: {success_count}, Skipped (Already ingested or empty): {skip_count}, Errors: {error_count}")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] Fatal Error: {e}")

if __name__ == "__main__":
    asyncio.run(backfill())
