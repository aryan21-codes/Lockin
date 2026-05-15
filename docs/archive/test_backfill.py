import sys
import os
import requests

from app.utils.config import settings
from supabase import create_client

def test():
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    email = "test-backfill2@example.com"
    password = "Password123!"
    
    try:
        auth_response = supabase.auth.sign_up({
            "email": email,
            "password": password
        })
    except Exception:
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
    token = auth_response.session.access_token

    print("Got token length:", len(token))

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    try:
        resp = requests.post("http://localhost:8000/api/brain/backfill", headers=headers)
        print("Status code:", resp.status_code)
        print("Response JSON:", resp.text)
    except Exception as e:
        print("Request failed:", e)

if __name__ == "__main__":
    test()
