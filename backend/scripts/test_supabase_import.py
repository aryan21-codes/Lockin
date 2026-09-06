import time
print("Importing supabase...")
t0 = time.time()
from supabase import create_client, Client
print(f"supabase loaded in {time.time()-t0:.3f}s")
