import time

def test_import(module_name):
    t0 = time.time()
    print(f"Importing {module_name}...", end="", flush=True)
    try:
        __import__(module_name)
        print(f" done ({time.time() - t0:.3f}s)")
    except Exception as e:
        print(f" failed: {e}")

test_import("os")
test_import("re")
test_import("urllib.request")
test_import("urllib.parse")
test_import("tempfile")
test_import("asyncio")
test_import("httpx")
test_import("lxml")
test_import("pptx")
print("Importing pptx subcomponents...")
t0 = time.time()
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn, nsdecls
from pptx.oxml import parse_xml
print(f"Done pptx subcomponents in {time.time() - t0:.3f}s")

# Check our app modules
import sys
sys.path.append(".")
test_import("app.utils.config")
test_import("app.utils.database")
test_import("app.services.openai_service")
