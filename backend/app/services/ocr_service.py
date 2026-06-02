import os
import logging
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

def extract_text_from_pdf_azure(pdf_path: str) -> str:
    """Extracts text from a PDF using Azure Document Intelligence Client."""
    if not settings.AZURE_OCR_ENDPOINT or not settings.AZURE_OCR_KEY:
        raise ValueError("Azure OCR credentials not configured.")
        
    from azure.ai.formrecognizer import DocumentAnalysisClient
    from azure.core.credentials import AzureKeyCredential
    
    client = DocumentAnalysisClient(
        endpoint=settings.AZURE_OCR_ENDPOINT, 
        credential=AzureKeyCredential(settings.AZURE_OCR_KEY)
    )
    
    with open(pdf_path, "rb") as f:
        poller = client.begin_analyze_document("prebuilt-read", f)
        res = poller.result()
        
    lines = []
    for page in getattr(res, "pages", []):
        for line in page.lines:
            lines.append(line.content)
            
    return "\n".join(lines)

def extract_text_from_pdf_tesseract(pdf_path: str) -> str:
    """Extracts text from a PDF by rendering pages as images and running Tesseract OCR."""
    try:
        from pdf2image import convert_from_path
        import pytesseract
    except ImportError:
        logger.error("Missing pdf2image or pytesseract dependencies for OCR fallback.")
        return ""
        
    if settings.TESSERACT_CMD:
        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
    elif os.name == 'nt':
        default_tesseract = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        if os.path.exists(default_tesseract):
            pytesseract.pytesseract.tesseract_cmd = default_tesseract
            
    poppler_path = settings.POPPLER_PATH
    if not poppler_path and os.name == 'nt':
        common_poppler_paths = [
            r"C:\Program Files\poppler\Library\bin",
            r"C:\Program Files\poppler\bin",
            r"C:\poppler\bin"
        ]
        for path in common_poppler_paths:
            if os.path.exists(path):
                poppler_path = path
                break
        
    try:
        logger.info(f"Starting Tesseract OCR fallback on: {pdf_path}")
        images = convert_from_path(pdf_path, poppler_path=poppler_path)
        extracted_text = []
        for i, image in enumerate(images):
            logger.info(f"Processing OCR on page {i+1}/{len(images)}")
            page_text = pytesseract.image_to_string(image)
            extracted_text.append(f"--- Page {i+1} ---\n{page_text}")
        return "\n\n".join(extracted_text)
    except Exception as e:
        logger.error(f"Tesseract OCR fallback failed: {e}. Ensure Tesseract and Poppler are installed on your system.")
        return ""

def extract_text_ocr(pdf_path: str) -> str:
    """
    Primary interface for OCR: Attempts Azure OCR. If it fails or is unconfigured,
    falls back to local Tesseract OCR.
    """
    if settings.AZURE_OCR_ENDPOINT and settings.AZURE_OCR_KEY:
        try:
            logger.info("Attempting Azure OCR...")
            return extract_text_from_pdf_azure(pdf_path)
        except Exception as e:
            logger.warning(f"Azure OCR failed: {e}. Falling back to Tesseract OCR...")
            
    return extract_text_from_pdf_tesseract(pdf_path)
