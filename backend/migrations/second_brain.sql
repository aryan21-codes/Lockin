-- ═══════════════════════════════════════════════════════
-- AI Second Brain — Supabase Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────
-- Table: knowledge_nodes
-- Stores unique topics per user
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    topic TEXT NOT NULL,
    description TEXT DEFAULT '',
    frequency INTEGER DEFAULT 1,
    last_accessed TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_user ON knowledge_nodes(user_id);

-- ─────────────────────────────────────
-- Table: knowledge_edges
-- Relationships between topics
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    from_topic TEXT NOT NULL,
    to_topic TEXT NOT NULL,
    relation_type TEXT NOT NULL DEFAULT 'related_to',
    strength INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, from_topic, to_topic)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_edges_user ON knowledge_edges(user_id);

-- ─────────────────────────────────────
-- Table: knowledge_embeddings
-- Vector store for RAG retrieval
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'workflow',
    source_id TEXT DEFAULT NULL,
    topic TEXT DEFAULT '',
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_user ON knowledge_embeddings(user_id);

-- ─────────────────────────────────────
-- Table: revision_schedule
-- Spaced repetition scheduling
-- ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS revision_schedule (
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
);

CREATE INDEX IF NOT EXISTS idx_revision_schedule_user ON revision_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_revision_schedule_review ON revision_schedule(user_id, next_review);

-- ─────────────────────────────────────
-- RPC: match_knowledge_embeddings
-- Vector similarity search function
-- ─────────────────────────────────────
CREATE OR REPLACE FUNCTION match_knowledge_embeddings(
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
$$;

-- ─────────────────────────────────────
-- Row Level Security (RLS)
-- ─────────────────────────────────────
ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_schedule ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can manage own knowledge_nodes"
    ON knowledge_nodes FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own knowledge_edges"
    ON knowledge_edges FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own knowledge_embeddings"
    ON knowledge_embeddings FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own revision_schedule"
    ON revision_schedule FOR ALL
    USING (auth.uid() = user_id);
