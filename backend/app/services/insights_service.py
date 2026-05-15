"""
Insights Service — analyzes user's knowledge graph, quiz performance,
and activity to generate smart study insights, spaced repetition scheduling,
and automatic weak-area quiz generation.
"""
import uuid
from datetime import datetime, timedelta
from app.utils.database import get_supabase
from app.services.openai_service import generate_json_response
from app.services.graph_service import get_knowledge_graph


# ─── Spaced Repetition Constants ───
MIN_INTERVAL = 1       # minimum 1 day
MAX_INTERVAL = 90      # cap at 90 days
EASY_MULTIPLIER = 2.5  # correct answer increases interval
HARD_MULTIPLIER = 0.5  # wrong answer decreases interval


async def generate_insights(user_id: str, access_token: str = None) -> dict:
    """
    Analyze user's knowledge graph to generate study insights:
    - Weak areas (low frequency, old last_accessed)
    - Strong areas (high frequency, recent access)
    - Revision suggestions
    - Overall stats
    """
    client = get_supabase(access_token)
    if not client:
        return {"insights": [], "stats": {}}

    try:
        # Fetch nodes
        nodes_result = (
            client.table("knowledge_nodes")
            .select("*")
            .eq("user_id", user_id)
            .order("frequency", desc=True)
            .execute()
        )
        nodes = nodes_result.data or []

        if not nodes:
            return {
                "insights": [
                    {
                        "type": "info",
                        "title": "Start Building Your Brain",
                        "message": "Upload study material through AI Workflow to start building your knowledge graph. Your insights will appear here.",
                        "priority": "low",
                    }
                ],
                "stats": {"total_topics": 0, "total_embeddings": 0},
                "weak_topics": [],
                "strong_topics": [],
            }

        # Fetch embeddings count
        embed_result = (
            client.table("knowledge_embeddings")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        embed_count = embed_result.count if embed_result.count else 0

        # Fetch revision schedule
        rev_result = (
            client.table("revision_schedule")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        revisions = rev_result.data or []

        # ── Analyze topics ──
        now = datetime.utcnow()
        insights = []
        weak_topics = []
        strong_topics = []

        for node in nodes:
            last = node.get("last_accessed")
            if last:
                try:
                    last_dt = datetime.fromisoformat(last.replace("Z", "+00:00").replace("+00:00", ""))
                except:
                    last_dt = now
                days_ago = (now - last_dt).days
            else:
                days_ago = 30

            freq = node.get("frequency", 1)
            topic = node.get("topic", "Unknown")

            # Weak: not accessed in 5+ days or low frequency
            if days_ago >= 5:
                weak_topics.append({
                    "topic": topic,
                    "days_since_review": days_ago,
                    "frequency": freq,
                    "description": node.get("description", ""),
                })
                if days_ago >= 7:
                    insights.append({
                        "type": "warning",
                        "title": f"Review {topic}",
                        "message": f"You haven't revisited '{topic}' in {days_ago} days. Consider reviewing it.",
                        "priority": "high" if days_ago >= 14 else "medium",
                        "topic": topic,
                    })

            # Strong: high frequency + recent
            if freq >= 3 and days_ago <= 3:
                strong_topics.append({
                    "topic": topic,
                    "frequency": freq,
                    "description": node.get("description", ""),
                })

        # Low confidence topics from revision schedule
        for rev in revisions:
            if rev.get("confidence_score", 0.5) < 0.4:
                insights.append({
                    "type": "alert",
                    "title": f"Weak in {rev['topic']}",
                    "message": f"Your confidence in '{rev['topic']}' is only {int(rev['confidence_score'] * 100)}%. Focus on this area.",
                    "priority": "high",
                    "topic": rev["topic"],
                })

        # Sort insights by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        insights.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 3))

        stats = {
            "total_topics": len(nodes),
            "total_embeddings": embed_count,
            "weak_count": len(weak_topics),
            "strong_count": len(strong_topics),
            "revision_due": sum(1 for r in revisions if r.get("next_review", "") <= now.isoformat()),
        }

        return {
            "insights": insights[:10],
            "stats": stats,
            "weak_topics": sorted(weak_topics, key=lambda x: x["days_since_review"], reverse=True)[:10],
            "strong_topics": strong_topics[:5],
        }

    except Exception as e:
        print(f"[Insights Error]: {e}")
        return {"insights": [], "stats": {}, "weak_topics": [], "strong_topics": []}


async def get_revision_schedule(user_id: str, access_token: str = None) -> list[dict]:
    """
    Get topics due for review (next_review <= now).
    """
    client = get_supabase(access_token)
    if not client:
        return []

    try:
        now = datetime.utcnow().isoformat()
        result = (
            client.table("revision_schedule")
            .select("*")
            .eq("user_id", user_id)
            .lte("next_review", now)
            .order("confidence_score")
            .limit(20)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"[Revision Error]: {e}")
        return []


async def update_confidence(
    user_id: str,
    topic: str,
    correct: bool,
    access_token: str = None,
) -> dict:
    """
    Update spaced repetition scores for a topic after review.
    - Correct: increase interval, boost confidence
    - Wrong: decrease interval, lower confidence
    """
    client = get_supabase(access_token)
    if not client:
        return {}

    try:
        existing = (
            client.table("revision_schedule")
            .select("*")
            .eq("user_id", user_id)
            .eq("topic", topic)
            .execute()
        )

        now = datetime.utcnow()

        if existing.data:
            rec = existing.data[0]
            old_interval = rec.get("interval_days", 1)
            old_confidence = rec.get("confidence_score", 0.5)
            review_count = rec.get("review_count", 0) + 1

            if correct:
                new_interval = min(int(old_interval * EASY_MULTIPLIER), MAX_INTERVAL)
                new_confidence = min(old_confidence + 0.15, 1.0)
            else:
                new_interval = max(int(old_interval * HARD_MULTIPLIER), MIN_INTERVAL)
                new_confidence = max(old_confidence - 0.2, 0.0)

            updated = (
                client.table("revision_schedule")
                .update({
                    "interval_days": new_interval,
                    "confidence_score": round(new_confidence, 2),
                    "next_review": (now + timedelta(days=new_interval)).isoformat(),
                    "review_count": review_count,
                    "updated_at": now.isoformat(),
                })
                .eq("id", rec["id"])
                .execute()
            )
            return updated.data[0] if updated.data else {}
        else:
            # Create new revision entry
            interval = 1 if not correct else 3
            confidence = 0.3 if not correct else 0.6
            record = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "topic": topic,
                "confidence_score": confidence,
                "interval_days": interval,
                "next_review": (now + timedelta(days=interval)).isoformat(),
                "review_count": 1,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }
            result = client.table("revision_schedule").insert(record).execute()
            return result.data[0] if result.data else {}

    except Exception as e:
        print(f"[Confidence Update Error]: {e}")
        return {}


async def ensure_revision_entries(user_id: str, access_token: str = None):
    """
    Ensure all knowledge nodes have a corresponding revision_schedule entry.
    Called during insights generation.
    """
    client = get_supabase(access_token)
    if not client:
        return

    try:
        nodes = (
            client.table("knowledge_nodes")
            .select("topic")
            .eq("user_id", user_id)
            .execute()
        ).data or []

        existing_revs = (
            client.table("revision_schedule")
            .select("topic")
            .eq("user_id", user_id)
            .execute()
        ).data or []

        existing_topics = {r["topic"] for r in existing_revs}
        now = datetime.utcnow()

        new_records = []
        for node in nodes:
            topic = node["topic"]
            if topic not in existing_topics:
                new_records.append({
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "topic": topic,
                    "confidence_score": 0.5,
                    "interval_days": 1,
                    "next_review": now.isoformat(),
                    "review_count": 0,
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                })

        if new_records:
            client.table("revision_schedule").insert(new_records).execute()
            print(f"[Revision] Created {len(new_records)} new revision entries")

    except Exception as e:
        print(f"[Revision Ensure Error]: {e}")


async def generate_weak_topic_quiz(
    user_id: str,
    access_token: str = None,
    model: str = "openai/gpt-4o-mini",
) -> dict:
    """
    Auto-generate a quiz from the user's weakest topics.
    """
    client = get_supabase(access_token)
    if not client:
        return {"questions": []}

    try:
        # Get weakest topics
        weak = (
            client.table("revision_schedule")
            .select("topic, confidence_score")
            .eq("user_id", user_id)
            .order("confidence_score")
            .limit(5)
            .execute()
        ).data or []

        if not weak:
            # Fallback: use least accessed nodes
            weak_nodes = (
                client.table("knowledge_nodes")
                .select("topic")
                .eq("user_id", user_id)
                .order("last_accessed")
                .limit(5)
                .execute()
            ).data or []
            weak = [{"topic": n["topic"], "confidence_score": 0.5} for n in weak_nodes]

        if not weak:
            return {"questions": [], "message": "No topics in your knowledge base yet."}

        topics_str = ", ".join(t["topic"] for t in weak)

        system_prompt = f"""You are an expert quiz generator. Create a focused revision quiz covering these weak topics: {topics_str}

Output ONLY a JSON object:
{{
    "questions": [
        {{
            "question": "Clear question text",
            "options": ["A", "B", "C", "D"],
            "correct": "The correct option text",
            "topic": "Which topic this tests",
            "explanation": "Brief explanation of the answer"
        }}
    ]
}}

Generate 5-8 MCQ questions. Distribute across the provided topics evenly."""

        result = await generate_json_response(
            system_prompt=system_prompt,
            user_prompt="Generate the weak-area revision quiz now.",
            model=model,
            max_tokens=2000,
        )

        return {
            "questions": result.get("questions", []),
            "weak_topics": weak,
        }
    except Exception as e:
        print(f"[Weak Quiz Error]: {e}")
        return {"questions": [], "error": str(e)}


async def explain_weak_topics(
    user_id: str,
    access_token: str = None,
    model: str = "openai/gpt-4o-mini",
) -> dict:
    """
    Generate detailed explanations for the user's weakest topics.
    """
    client = get_supabase(access_token)
    if not client:
        return {"explanations": []}

    try:
        weak = (
            client.table("revision_schedule")
            .select("topic, confidence_score")
            .eq("user_id", user_id)
            .order("confidence_score")
            .limit(5)
            .execute()
        ).data or []

        if not weak:
            return {"explanations": [], "message": "No weak topics found."}

        topics_str = ", ".join(f"{t['topic']} ({int(t['confidence_score']*100)}% confidence)" for t in weak)

        system_prompt = f"""You are an expert tutor. The student is weak in these topics: {topics_str}

Provide clear, concise explanations to help them understand each topic better.

Output ONLY JSON:
{{
    "explanations": [
        {{
            "topic": "Topic Name",
            "explanation": "Clear, detailed explanation (2-3 paragraphs)",
            "key_formula": "Any key formula or rule if applicable (or null)",
            "study_tip": "A specific study tip for this topic"
        }}
    ]
}}"""

        result = await generate_json_response(
            system_prompt=system_prompt,
            user_prompt="Explain my weak topics now.",
            model=model,
            max_tokens=2500,
        )

        return {
            "explanations": result.get("explanations", []),
            "weak_topics": weak,
        }
    except Exception as e:
        print(f"[Explain Weak Error]: {e}")
        return {"explanations": [], "error": str(e)}
