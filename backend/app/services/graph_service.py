"""
Knowledge Graph Service — extracts topics, subtopics, and relationships from content
using OpenAI, then stores them as nodes and edges in Supabase.
"""
import uuid
from datetime import datetime
from app.services.openai_service import generate_json_response
from app.utils.database import get_supabase


async def extract_topics_and_relations(text: str, model: str = "openai/gpt-4o-mini") -> dict:
    """
    Use OpenAI to extract topics, subtopics, and relationships from content.
    Returns: { topics: [...], relations: [...] }
    """
    system_prompt = """You are a knowledge graph builder for an academic study system.
Given study material, extract the key topics, subtopics, and their relationships.

Output ONLY a JSON object matching this exact schema:
{
    "topics": [
        {
            "name": "Topic Name",
            "description": "Brief 1-sentence description"
        }
    ],
    "relations": [
        {
            "from": "Topic A",
            "to": "Topic B",
            "type": "includes|requires|related_to|is_part_of|builds_on|contrasts_with"
        }
    ]
}

Rules:
- Extract 3-10 meaningful topics (not too granular, not too broad)
- Topic names should be concise (1-4 words)
- Always include relationships between extracted topics
- Relation types MUST be one of: includes, requires, related_to, is_part_of, builds_on, contrasts_with
- Every topic should have at least one relationship"""

    try:
        result = await generate_json_response(
            system_prompt=system_prompt,
            user_prompt=f"Extract topics and relationships from this material:\n\n{text[:6000]}",
            model=model,
            max_tokens=1500,
        )
        return {
            "topics": result.get("topics", []),
            "relations": result.get("relations", []),
        }
    except Exception as e:
        print(f"[Graph Service] Topic extraction failed: {e}")
        return {"topics": [], "relations": []}


async def upsert_knowledge_nodes(
    user_id: str,
    topics: list[dict],
    access_token: str = None
) -> list[dict]:
    """
    Insert or update knowledge nodes. If a topic already exists for the user,
    increment its frequency and update last_accessed.
    Returns list of upserted node records.
    """
    client = get_supabase(access_token)
    if not client:
        return []

    upserted = []
    for topic_data in topics:
        name = topic_data.get("name", "").strip()
        desc = topic_data.get("description", "").strip()
        if not name:
            continue

        try:
            # Check if node exists
            existing = (
                client.table("knowledge_nodes")
                .select("*")
                .eq("user_id", user_id)
                .eq("topic", name)
                .execute()
            )

            if existing.data:
                # Update: increment frequency, update description and last_accessed
                node = existing.data[0]
                updated = (
                    client.table("knowledge_nodes")
                    .update({
                        "frequency": node["frequency"] + 1,
                        "last_accessed": datetime.utcnow().isoformat(),
                        "description": desc or node.get("description", ""),
                    })
                    .eq("id", node["id"])
                    .execute()
                )
                upserted.append(updated.data[0] if updated.data else node)
            else:
                # Insert new node
                record = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "topic": name,
                    "description": desc,
                    "frequency": 1,
                    "last_accessed": datetime.utcnow().isoformat(),
                    "created_at": datetime.utcnow().isoformat(),
                }
                result = client.table("knowledge_nodes").insert(record).execute()
                if result.data:
                    upserted.append(result.data[0])
        except Exception as e:
            print(f"[Graph Service] Node upsert error for '{name}': {e}")

    print(f"[Graph Service] Upserted {len(upserted)} nodes")
    return upserted


async def upsert_knowledge_edges(
    user_id: str,
    relations: list[dict],
    access_token: str = None
) -> list[dict]:
    """
    Insert or update knowledge edges. If an edge already exists,
    increment its strength.
    """
    client = get_supabase(access_token)
    if not client:
        return []

    upserted = []
    for rel in relations:
        from_topic = rel.get("from", "").strip()
        to_topic = rel.get("to", "").strip()
        rel_type = rel.get("type", "related_to").strip()
        if not from_topic or not to_topic:
            continue

        try:
            existing = (
                client.table("knowledge_edges")
                .select("*")
                .eq("user_id", user_id)
                .eq("from_topic", from_topic)
                .eq("to_topic", to_topic)
                .execute()
            )

            if existing.data:
                edge = existing.data[0]
                updated = (
                    client.table("knowledge_edges")
                    .update({
                        "strength": edge["strength"] + 1,
                        "relation_type": rel_type,
                    })
                    .eq("id", edge["id"])
                    .execute()
                )
                upserted.append(updated.data[0] if updated.data else edge)
            else:
                record = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "from_topic": from_topic,
                    "to_topic": to_topic,
                    "relation_type": rel_type,
                    "strength": 1,
                    "created_at": datetime.utcnow().isoformat(),
                }
                result = client.table("knowledge_edges").insert(record).execute()
                if result.data:
                    upserted.append(result.data[0])
        except Exception as e:
            print(f"[Graph Service] Edge upsert error '{from_topic}→{to_topic}': {e}")

    print(f"[Graph Service] Upserted {len(upserted)} edges")
    return upserted


async def get_knowledge_graph(user_id: str, access_token: str = None) -> dict:
    """
    Retrieve the full knowledge graph for a user.
    Returns: { nodes: [...], edges: [...] }
    """
    client = get_supabase(access_token)
    if not client:
        return {"nodes": [], "edges": []}

    try:
        nodes_result = (
            client.table("knowledge_nodes")
            .select("*")
            .eq("user_id", user_id)
            .order("frequency", desc=True)
            .execute()
        )
        edges_result = (
            client.table("knowledge_edges")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        return {
            "nodes": nodes_result.data or [],
            "edges": edges_result.data or [],
        }
    except Exception as e:
        print(f"[Graph Service] Get graph error: {e}")
        return {"nodes": [], "edges": []}
