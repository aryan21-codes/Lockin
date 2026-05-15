"""
Embedding Service — generates and stores vector embeddings via OpenAI/OpenRouter.
Uses text-embedding-3-small (1536 dimensions).
"""
import json
from openai import AsyncOpenAI
from app.utils.config import settings
from app.utils.database import get_supabase
from app.utils.chunking import chunk_text
import uuid
from datetime import datetime

# Reuse same OpenRouter client
_client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.OPENAI_API_KEY,
)

EMBEDDING_MODEL = "openai/text-embedding-3-small"
EMBEDDING_DIM = 1536
MAX_EMBED_TOKENS = 8000  # safe limit per chunk


async def generate_embedding(text: str) -> list[float]:
    """
    Generate a 1536-dim embedding vector for the given text.
    Falls back to zero-vector on error (so pipeline doesn't crash).
    """
    if not text or len(text.strip()) < 10:
        return [0.0] * EMBEDDING_DIM

    # Truncate to safe token limit (~4 chars per token)
    truncated = text[:MAX_EMBED_TOKENS * 4]

    try:
        response = await _client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=truncated,
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"[Embedding Error]: {e}")
        # Return zero vector so the pipeline continues
        return [0.0] * EMBEDDING_DIM


async def store_embedding(
    user_id: str,
    content: str,
    source_type: str = "workflow",
    source_id: str = None,
    topic: str = "",
    access_token: str = None
) -> bool:
    """
    Generate an embedding for content and store it in knowledge_embeddings.
    """
    embedding = await generate_embedding(content)

    # Skip storage if embedding failed (all zeros)
    if all(v == 0.0 for v in embedding[:10]):
        print(f"[Embedding] Skipping storage — zero vector for: {content[:50]}...")
        return False

    client = get_supabase(access_token)
    if not client:
        return False

    try:
        record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "content": content[:5000],  # cap storage size
            "source_type": source_type,
            "source_id": source_id,
            "topic": topic,
            "embedding": embedding,
            "created_at": datetime.utcnow().isoformat(),
        }
        client.table("knowledge_embeddings").insert(record).execute()
        return True
    except Exception as e:
        print(f"[Embedding Store Error]: {e}")
        return False


async def search_similar(
    user_id: str,
    query_text: str,
    limit: int = 5,
    access_token: str = None
) -> list[dict]:
    """
    Find the most similar knowledge chunks for a user's query.
    Uses the Supabase RPC function match_knowledge_embeddings.
    """
    query_embedding = await generate_embedding(query_text)

    if all(v == 0.0 for v in query_embedding[:10]):
        return []

    client = get_supabase(access_token)
    if not client:
        return []

    try:
        result = client.rpc("match_knowledge_embeddings", {
            "query_embedding": query_embedding,
            "match_user_id": user_id,
            "match_count": limit,
            "match_threshold": 0.3,
        }).execute()
        return result.data or []
    except Exception as e:
        print(f"[Embedding Search Error]: {e}")
        return []


async def store_content_chunks(
    user_id: str,
    content: str,
    source_type: str = "workflow",
    source_id: str = None,
    topic: str = "",
    access_token: str = None,
    chunk_size: int = 1500,
    overlap: int = 200,
) -> int:
    """
    Chunk content and store each chunk as a separate embedding.
    Returns count of successfully stored chunks.
    """
    chunks = chunk_text(content, chunk_size=chunk_size, overlap=overlap)
    stored = 0

    for chunk in chunks:
        if len(chunk.strip()) < 50:
            continue
        success = await store_embedding(
            user_id=user_id,
            content=chunk,
            source_type=source_type,
            source_id=source_id,
            topic=topic,
            access_token=access_token,
        )
        if success:
            stored += 1

    print(f"[Embedding] Stored {stored}/{len(chunks)} chunks for {source_type}")
    return stored
