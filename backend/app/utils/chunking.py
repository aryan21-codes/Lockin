def chunk_text(text: str, chunk_size: int = 20000, overlap: int = 500) -> list[str]:
    """
    Chunks a large string of text into smaller segments based on size and optional rolling overlap.
    """
    if not text:
        return []

    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = min(start + chunk_size, text_length)
        chunk = text[start:end]
        chunks.append(chunk)
        if end == text_length:
            break
        start += (chunk_size - overlap)
        
    return chunks
