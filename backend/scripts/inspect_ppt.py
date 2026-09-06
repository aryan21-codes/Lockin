import os
import sys
from pptx import Presentation

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def safe_str(s):
    # Encode to ascii ignoring characters that can't be represented
    return s.encode('ascii', errors='replace').decode('ascii')

def inspect():
    path = r"C:\Users\ultra\OneDrive\Documents\SIGMA WEB DEV\Lockin\backend\output\presentation_Quantum_Computing_and_Future_Technologie.pptx"
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    
    prs = Presentation(path)
    print(f"Presentation loaded. Slide count: {len(prs.slides)}")
    print(f"Dimensions: {prs.slide_width.inches:.3f}x{prs.slide_height.inches:.3f} inches\n")
    
    for idx, slide in enumerate(prs.slides):
        print(f"--- Slide {idx+1} ---")
        # Check background fill type
        bg = slide.background
        if bg and bg.fill:
            print(f"Background Fill Type: {bg.fill.type}")
        
        print("Shapes in slide:")
        for shape in slide.shapes:
            shape_type = shape.shape_type
            name = shape.name
            left = shape.left.inches if shape.left else 0
            top = shape.top.inches if shape.top else 0
            width = shape.width.inches if shape.width else 0
            height = shape.height.inches if shape.height else 0
            
            print(f"  - [{shape_type}] '{name}' at ({left:.2f}, {top:.2f}) size ({width:.2f}x{height:.2f})")
            if shape.has_text_frame:
                text = shape.text_frame.text.replace("\n", " | ")
                if text.strip():
                    print(f"    Text: \"{safe_str(text[:120])}\"")
        print()

inspect()
