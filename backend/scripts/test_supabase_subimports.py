import time
import sys

def test_import(module_name):
    t0 = time.time()
    print(f"Importing {module_name}...", end="", flush=True)
    try:
        __import__(module_name)
        print(f" done ({time.time() - t0:.3f}s)")
    except Exception as e:
        print(f" failed: {e}")

test_import("postgrest")
test_import("realtime")
test_import("storage3")
test_import("gotrue") # or supabase_auth
test_import("supabase_auth")
try:
    print("Importing supabase...")
    import supabase
    print("supabase imported successfully!")
except Exception as e:
    print(f"supabase import failed: {e}")
