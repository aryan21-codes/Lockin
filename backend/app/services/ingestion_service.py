"""
Ingestion Service — the central orchestrator that feeds content into the
knowledge graph and embedding store.

Called after every content generation (workflows, notes, flashcards, code explanations).
Each ingestion: chunks → extracts topics → generates embeddings → stores everything.
"""
import asyncio
from app.services.graph_service import extract_topics_and_relations, upsert_knowledge_nodes, upsert_knowledge_edges
from app.services.embedding_service import store_content_chunks
from app.utils.chunking import chunk_text


async def ingest_content(
    user_id: str,
    content: str,
    source_type: str = "workflow",
    source_id: str = None,
    source_title: str = "",
    access_token: str = None,
) -> dict:
    """
    Full ingestion pipeline:
      1. Extract topics and relationships from content
      2. Upsert knowledge graph nodes and edges
      3. Chunk and embed content for RAG retrieval

    This runs asynchronously and should not block the main request.
    Returns a summary of what was ingested.
    """
    if not content or len(content.strip()) < 50:
        print(f"[Ingestion] Content too short to ingest ({len(content)} chars)")
        return {"status": "skipped", "reason": "content_too_short"}

    print(f"[Ingestion] Starting for '{source_title}' ({source_type}, {len(content)} chars)")

    results = {
        "source_type": source_type,
        "source_title": source_title,
        "topics_extracted": 0,
        "edges_created": 0,
        "chunks_embedded": 0,
    }

    try:
        # ──── Step 1: Extract topics & relationships ────
        graph_data = await extract_topics_and_relations(content)
        topics = graph_data.get("topics", [])
        relations = graph_data.get("relations", [])

        # ──── Step 2: Upsert graph nodes ────
        if topics:
            upserted_nodes = await upsert_knowledge_nodes(
                user_id=user_id,
                topics=topics,
                access_token=access_token,
            )
            results["topics_extracted"] = len(upserted_nodes)

        # ──── Step 3: Upsert graph edges ────
        if relations:
            upserted_edges = await upsert_knowledge_edges(
                user_id=user_id,
                relations=relations,
                access_token=access_token,
            )
            results["edges_created"] = len(upserted_edges)

        # ──── Step 4: Chunk & embed content ────
        # Determine primary topic for tagging
        primary_topic = topics[0]["name"] if topics else source_title
        stored_count = await store_content_chunks(
            user_id=user_id,
            content=content,
            source_type=source_type,
            source_id=source_id,
            topic=primary_topic,
            access_token=access_token,
            chunk_size=1500,
            overlap=200,
        )
        results["chunks_embedded"] = stored_count

    except Exception as e:
        print(f"[Ingestion Error]: {e}")
        results["error"] = str(e)

    print(f"[Ingestion] Complete: {results['topics_extracted']} topics, "
          f"{results['edges_created']} edges, {results['chunks_embedded']} chunks")
    return results


async def ingest_workflow_result(
    user_id: str,
    workflow_result: dict,
    access_token: str = None,
) -> dict:
    """
    Specialized ingestion for workflow pipeline results.
    Combines summary, key points, and flashcard Q&As into a single content block.
    """
    parts = []

    source_file = workflow_result.get("source_file", "Unknown")

    # Add summary
    summary = workflow_result.get("summary", "")
    if summary:
        parts.append(f"Summary:\n{summary}")

    # Add key points
    key_points = workflow_result.get("key_points", [])
    if key_points:
        points_text = "\n".join(f"- {p}" for p in key_points)
        parts.append(f"Key Points:\n{points_text}")

    # Add flashcard Q&As  
    flashcards = workflow_result.get("flashcards", [])
    if flashcards:
        fc_text = "\n".join(
            f"Q: {fc.get('question', '')}\nA: {fc.get('answer', '')}"
            for fc in flashcards
        )
        parts.append(f"Study Flashcards:\n{fc_text}")

    combined_content = "\n\n".join(parts)

    if not combined_content:
        return {"status": "skipped", "reason": "no_content"}

    return await ingest_content(
        user_id=user_id,
        content=combined_content,
        source_type="workflow",
        source_id=None,
        source_title=source_file,
        access_token=access_token,
    )


def trigger_background_ingestion(
    user_id: str,
    content: str,
    source_type: str,
    source_title: str = "",
    access_token: str = None,
):
    """
    Fire-and-forget ingestion that doesn't block the response.
    Uses asyncio.create_task from the running event loop.
    """
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(
            ingest_content(
                user_id=user_id,
                content=content,
                source_type=source_type,
                source_title=source_title,
                access_token=access_token,
            )
        )
        print(f"[Ingestion] Background task created for {source_type}: {source_title}")
    except RuntimeError:
        print("[Ingestion] No event loop — skipping background ingestion")
