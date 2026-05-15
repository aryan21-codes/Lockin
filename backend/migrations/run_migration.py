"""Quick script to create Second Brain tables via Supabase RPC."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client
from app.utils.config import settings

client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

# We'll create tables using individual SQL statements via Supabase's postgrest
# Since we can't run DDL via REST, we use the management API
# Actually, Supabase Python SDK doesn't expose raw SQL execution for DDL
# We need to use the Supabase HTTP API with the service role key

import requests

# Use the Supabase SQL endpoint
headers = {
    "apikey": settings.SUPABASE_KEY,
    "Authorization": f"Bearer {settings.SUPABASE_KEY}",
    "Content-Type": "application/json",
}

sql_statements = [
    "CREATE EXTENSION IF NOT EXISTS vector",
    
    """CREATE TABLE IF NOT EXISTS knowledge_nodes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        topic TEXT NOT NULL,
        description TEXT DEFAULT '',
        frequency INTEGER DEFAULT 1,
        last_accessed TIMESTAMPTZ DEFAULT now(),
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(user_id, topic)
    )""",
    
    "CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_user ON knowledge_nodes(user_id)",
    
    """CREATE TABLE IF NOT EXISTS knowledge_edges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        from_topic TEXT NOT NULL,
        to_topic TEXT NOT NULL,
        relation_type TEXT NOT NULL DEFAULT 'related_to',
        strength INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(user_id, from_topic, to_topic)
    )""",
    
    "CREATE INDEX IF NOT EXISTS idx_knowledge_edges_user ON knowledge_edges(user_id)",
    
    """CREATE TABLE IF NOT EXISTS knowledge_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        content TEXT NOT NULL,
        source_type TEXT NOT NULL DEFAULT 'workflow',
        source_id TEXT DEFAULT NULL,
        topic TEXT DEFAULT '',
        embedding vector(1536),
        created_at TIMESTAMPTZ DEFAULT now()
    )""",
    
    "CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_user ON knowledge_embeddings(user_id)",
    
    """CREATE TABLE IF NOT EXISTS revision_schedule (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        topic TEXT NOT NULL,
        confidence_score FLOAT DEFAULT 0.5,
        next_review TIMESTAMPTZ DEFAULT now(),
        interval_days INTEGER DEFAULT 1,
        review_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(user_id, topic)
    )""",
    
    "CREATE INDEX IF NOT EXISTS idx_revision_schedule_user ON revision_schedule(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_revision_schedule_review ON revision_schedule(user_id, next_review)",
    
    """CREATE OR REPLACE FUNCTION match_knowledge_embeddings(
        query_embedding vector(1536),
        match_user_id UUID,
        match_count INT DEFAULT 5,
        match_threshold FLOAT DEFAULT 0.3
    )
    RETURNS TABLE (
        id UUID,
        user_id UUID,
        content TEXT,
        source_type TEXT,
        topic TEXT,
        similarity FLOAT
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
        RETURN QUERY
        SELECT
            ke.id,
            ke.user_id,
            ke.content,
            ke.source_type,
            ke.topic,
            1 - (ke.embedding <=> query_embedding) AS similarity
        FROM knowledge_embeddings ke
        WHERE ke.user_id = match_user_id
            AND 1 - (ke.embedding <=> query_embedding) > match_threshold
        ORDER BY ke.embedding <=> query_embedding
        LIMIT match_count;
    END;
    $$""",
    
    "ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE knowledge_edges ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY",
    "ALTER TABLE revision_schedule ENABLE ROW LEVEL SECURITY",
    
    """DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own knowledge_nodes') THEN
            CREATE POLICY "Users can manage own knowledge_nodes" ON knowledge_nodes FOR ALL USING (auth.uid() = user_id);
        END IF;
    END $$""",
    
    """DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own knowledge_edges') THEN
            CREATE POLICY "Users can manage own knowledge_edges" ON knowledge_edges FOR ALL USING (auth.uid() = user_id);
        END IF;
    END $$""",
    
    """DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own knowledge_embeddings') THEN
            CREATE POLICY "Users can manage own knowledge_embeddings" ON knowledge_embeddings FOR ALL USING (auth.uid() = user_id);
        END IF;
    END $$""",
    
    """DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own revision_schedule') THEN
            CREATE POLICY "Users can manage own revision_schedule" ON revision_schedule FOR ALL USING (auth.uid() = user_id);
        END IF;
    END $$""",
]

# Execute via Supabase REST SQL endpoint (uses pg_net or query endpoint)
base_url = settings.SUPABASE_URL
sql_url = f"{base_url}/rest/v1/rpc"

print("Attempting to execute migration via Supabase SQL...")
print("=" * 60)

# Try using the /pg endpoint which some Supabase versions support
pg_url = f"{base_url}/pg"

for i, stmt in enumerate(sql_statements):
    short = stmt.strip()[:60].replace('\n', ' ')
    try:
        # Try via rpc('exec_sql') - won't work on free tier
        # Instead try direct postgREST
        resp = requests.post(
            f"{base_url}/rest/v1/rpc/exec_sql",
            headers=headers,
            json={"query": stmt}
        )
        if resp.status_code == 200:
            print(f"  [{i+1:2d}] OK: {short}...")
        else:
            print(f"  [{i+1:2d}] HTTP {resp.status_code}: {short}...")
    except Exception as e:
        print(f"  [{i+1:2d}] ERR: {str(e)[:80]}")

print()
print("=" * 60)
print("NOTE: If the above shows errors, you need to manually run the SQL.")
print(f"Copy contents of: migrations/second_brain.sql")
print(f"Paste into: Supabase Dashboard > SQL Editor > New Query > Run")
print(f"URL: https://supabase.com/dashboard/project/gmujwnakcwtooqfjbtxc/sql/new")
print("=" * 60)
