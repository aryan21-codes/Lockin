"""
RAG Service — Retrieval-Augmented Generation against the user's own knowledge base.
Embeds the user's question, finds similar knowledge chunks, and uses them as context
for an OpenAI chat response. Answers are grounded ONLY in the user's data.
"""
from app.services.embedding_service import search_similar
from app.services.openai_service import generate_json_response


async def ask_knowledge_base(
    user_id: str,
    question: str,
    access_token: str = None,
    model: str = "openai/gpt-4o-mini",
) -> dict:
    """
    Full RAG flow:
      1. Embed the user's question
      2. Retrieve similar chunks from knowledge_embeddings
      3. Build a context window from retrieved chunks
      4. Call OpenAI with context + question
      5. Return answer with source citations

    Returns: { answer: str, sources: [...], context_used: int }
    """
    if not question or len(question.strip()) < 3:
        return {
            "answer": "Please ask a more specific question.",
            "sources": [],
            "context_used": 0,
        }

    # Step 1 & 2: Find similar knowledge chunks
    similar_chunks = await search_similar(
        user_id=user_id,
        query_text=question,
        limit=6,
        access_token=access_token,
    )

    if not similar_chunks:
        return {
            "answer": "I don't have enough information in your knowledge base to answer this question yet. Try uploading more study material through the AI Workflow first!",
            "sources": [],
            "context_used": 0,
        }

    # Step 3: Build context from retrieved chunks
    context_parts = []
    sources = []
    for i, chunk in enumerate(similar_chunks, 1):
        context_parts.append(
            f"[Source {i} — {chunk.get('source_type', 'unknown')}, "
            f"Topic: {chunk.get('topic', 'general')}, "
            f"Relevance: {chunk.get('similarity', 0):.1%}]\n"
            f"{chunk.get('content', '')}"
        )
        sources.append({
            "id": chunk.get("id"),
            "source_type": chunk.get("source_type", "unknown"),
            "topic": chunk.get("topic", ""),
            "similarity": round(chunk.get("similarity", 0), 3),
            "preview": chunk.get("content", "")[:150] + "...",
        })

    context = "\n\n---\n\n".join(context_parts)

    # Step 4: Call OpenAI with grounded context
    system_prompt = f"""You are a helpful AI study assistant for a student. You have access to this student's personal study notes and knowledge base.

IMPORTANT RULES:
1. ONLY answer using the provided context from the student's knowledge base
2. If the context doesn't contain enough information to answer fully, say so honestly
3. Reference which sources you used in your answer
4. Be concise but thorough
5. Use bullet points for clarity when appropriate
6. If the question is about a topic not covered in the context, suggest the student study it

STUDENT'S KNOWLEDGE BASE CONTEXT:
{context}"""

    try:
        result = await generate_json_response(
            system_prompt=system_prompt,
            user_prompt=f"""Answer this question using ONLY my knowledge base context above:

Question: {question}

Respond as JSON:
{{
    "answer": "Your detailed answer here, referencing Source numbers where relevant",
    "topics_referenced": ["list", "of", "topics", "used"],
    "confidence": "high|medium|low (based on how well the context covers the question)"
}}""",
            model=model,
            max_tokens=1500,
        )

        return {
            "answer": result.get("answer", "I couldn't generate an answer."),
            "topics_referenced": result.get("topics_referenced", []),
            "confidence": result.get("confidence", "medium"),
            "sources": sources,
            "context_used": len(similar_chunks),
        }
    except Exception as e:
        print(f"[RAG Error]: {e}")
        return {
            "answer": f"Sorry, I encountered an error while processing your question: {str(e)}",
            "sources": sources,
            "context_used": len(similar_chunks),
        }
