import os
import jwt
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv("backend/.env")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
secret = os.getenv("SUPABASE_JWT_SECRET").strip('"').strip("'")
supabase = create_client(url, key)

email = "testauth239@gmail.com"
password = "testpassword123"
print("Logging in or signing up:", email)

try:
    res = supabase.auth.sign_up({"email": email, "password": password})
except Exception:
    res = supabase.auth.sign_in_with_password({"email": email, "password": password})

if not getattr(res, "session", None):
    res = supabase.auth.sign_in_with_password({"email": email, "password": password})

token = res.session.access_token
print("Token retrieved!")

try:
    payload = jwt.decode(
        token,
        secret,
        algorithms=["HS256"],
        options={"verify_aud": False}
    )
    print("DECODE WITH RAW STRING SUCCESS:", payload)
except Exception as e:
    print("DECODE WITH RAW STRING FAILED:", str(e))

    # Try decode with utf-8 encoded string if different
    # Try decode with base64 decoded string
    print("Trying base64 padding decode ...")
    import base64
    try:
        padding_added = secret + '=='
        b64_secret = base64.urlsafe_b64decode(padding_added)
        payload = jwt.decode(token, b64_secret, algorithms=["HS256"], options={"verify_aud": False})
        print("DECODE WITH URLSAFE B64 SUCCESS!")
        print(payload)
    except Exception as e2:
        print("B64 FAIL:", e2)
