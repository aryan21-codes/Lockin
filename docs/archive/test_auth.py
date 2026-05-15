import asyncio
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv("backend/.env")

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

def main():
    try:
        email = "testfake123123@example.com"
        password = "testpassword123"
        print("Signing up:", email)
        res = supabase.auth.sign_up({"email": email, "password": password})
        
        if not res.session:
            print("Session generation failed or email confirmation required.")
            return

        token = res.session.access_token
        print("Token retrieved!")
        
        import urllib.request, urllib.error
        req = urllib.request.Request('http://localhost:8000/api/dashboard/stats', headers={'Authorization': f'Bearer {token}'})
        
        try:
            resp = urllib.request.urlopen(req)
            print("SUCCESS!", resp.read().decode())
        except urllib.error.HTTPError as e:
            print("BACKEND HTTP ERROR:", e.code, e.read().decode())
    except Exception as e:
        print("PYTHON ERROR:", e)

main()
