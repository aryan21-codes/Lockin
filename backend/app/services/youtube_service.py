import urllib.parse
from youtube_transcript_api import YouTubeTranscriptApi
from app.services.openai_service import generate_json_response
from app.utils.chunking import chunk_text
from app.utils.database import log_generation

def extract_video_id(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    if hostname := parsed.hostname:
        if hostname == 'youtu.be': return parsed.path[1:]
        if hostname in ('www.youtube.com', 'youtube.com'):
            if parsed.path == '/watch': return urllib.parse.parse_qs(parsed.query)['v'][0]
    raise ValueError("Invalid YouTube URL")

def fetch_timestamped_transcript(video_id: str) -> str:
    """Fetches the transcript and formats it with [MM:SS] markers to allow AI timestamping."""
    api = YouTubeTranscriptApi()
    transcript_list = api.fetch(video_id)
    formatted = []
    
    for entry in transcript_list:
        start_seconds = int(entry.start)
        minutes = start_seconds // 60
        seconds = start_seconds % 60
        # e.g., [12:05] Here is the point...
        formatted.append(f"[{minutes:02}:{seconds:02}] {entry.text}")
        
    return "\n".join(formatted)

async def summarize_youtube_video(url: str, user_id: str = "anonymous", model="openai/gpt-4o-mini") -> dict:
    video_id = extract_video_id(url)
    try:
        transcript = fetch_timestamped_transcript(video_id)
    except Exception as e:
        raise ValueError(f"Failed to fetch transcript (video might not have captions enabled): {e}")

    # Chunking
    chunks = chunk_text(transcript, chunk_size=80000, overlap=1000)
    final_text = "\n...\n".join(chunks[:3])

    system_prompt = '''You are an expert academic assistant designed to summarize video lectures and talks.
I will provide you with a chronological video transcript that includes [MM:SS] timestamps.
Extract the main summary, key points, and explicitly grab crucial timestamps where major topic shifts occur.

Respond ONLY with a JSON object in this format:
{
  "summary": "Detailed paragraph overview",
  "key_points": ["Point 1", "Point 2"],
  "timestamps": [
    {"time": "02:15", "desc": "Introduction to the main theory"},
    {"time": "15:30", "desc": "Formula applied to sample set"}
  ]
}'''

    response = await generate_json_response(
        system_prompt=system_prompt,
        user_prompt=f"Please analyze this transcript:\n{final_text}",
        model=model
    )
    
    # Supabase tracking
    log_generation(user_id=user_id, content_type="youtube_summary", content_data={"url": url, **response})
    
    return response
