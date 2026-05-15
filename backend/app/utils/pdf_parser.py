import fitz

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Takes raw PDF bytes (like from FastAPI UploadFile.read())
    and returns a clean, concatenated string of extracted text using PyMuPDF.
    """
    text = ""
    try:
        # Load PDF document from memory
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page in doc:
            # get_text automatically handles layout and encoding mapping deeply
            extracted = page.get_text("text")
            if extracted:
                text += extracted + "\n\n"
        doc.close()
    except Exception as e:
        print(f"Error extracting PDF: {e}")
        raise e
        
    return text.strip()
