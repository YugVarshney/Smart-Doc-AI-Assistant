import os
import logging
from typing import List, Dict, Any
from pypdf import PdfReader
from backend.app.services.ocr_service import extract_text_ocr

logger = logging.getLogger(__name__)

def parse_docx(file_path: str) -> List[Dict[str, Any]]:
    """Parses DOCX file and returns paragraphs with metadata."""
    try:
        import docx
    except ImportError:
        logger.error("python-docx is not installed.")
        return [{"text": "python-docx package not installed.", "page": 1, "start_char": 0, "end_char": 0}]
        
    doc = docx.Document(file_path)
    paragraphs = []
    current_char = 0
    
    for i, para in enumerate(doc.paragraphs):
        text = para.text.strip()
        if not text:
            continue
        text_len = len(text)
        paragraphs.append({
            "text": text,
            "page": 1,
            "start_char": current_char,
            "end_char": current_char + text_len
        })
        current_char += text_len + 1
        
    return paragraphs

def parse_txt(file_path: str) -> List[Dict[str, Any]]:
    """Parses TXT file and returns lines/paragraphs with metadata."""
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
        
    paragraphs = []
    parts = content.split("\n\n")
    current_char = 0
    
    for part in parts:
        text = part.strip()
        if not text:
            continue
        text_len = len(text)
        paragraphs.append({
            "text": text,
            "page": 1,
            "start_char": current_char,
            "end_char": current_char + text_len
        })
        current_char += text_len + 2
        
    return paragraphs

def parse_pdf(file_path: str) -> List[Dict[str, Any]]:
    """
    Parses PDF file. Checks text density to detect if it is scanned.
    If scanned, triggers OCR pipeline. Otherwise extracts text using pypdf.
    """
    reader = PdfReader(file_path)
    num_pages = len(reader.pages)
    
    total_text = ""
    pages_text = []
    
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        total_text += text
        pages_text.append(text)
        
    is_scanned = len(total_text.strip()) < 100 * num_pages
    
    paragraphs = []
    if is_scanned:
        logger.info(f"PDF {file_path} appears scanned. Triggering OCR pipeline...")
        ocr_text = extract_text_ocr(file_path)
        if "--- Page " in ocr_text:
            pages = ocr_text.split("--- Page ")
            for page_part in pages:
                if not page_part.strip():
                    continue
                lines = page_part.split("\n", 1)
                page_header = lines[0].split("---")[0].strip()
                try:
                    page_num = int(page_header)
                except ValueError:
                    page_num = 1
                
                page_content = lines[1] if len(lines) > 1 else ""
                paragraphs.extend(split_page_into_paragraphs(page_content, page_num))
        else:
            paragraphs.extend(split_page_into_paragraphs(ocr_text, 1))
    else:
        logger.info(f"Normal text extraction succeeded for {file_path}.")
        for i, text in enumerate(pages_text):
            paragraphs.extend(split_page_into_paragraphs(text, i + 1))
            
    return paragraphs

def split_page_into_paragraphs(page_text: str, page_num: int) -> List[Dict[str, Any]]:
    """Splits a single page text block into paragraphs and tracks character offsets."""
    paragraphs = []
    lines = page_text.split("\n\n")
    current_char = 0
    
    for line in lines:
        text = line.strip()
        if not text:
            continue
        text_len = len(text)
        paragraphs.append({
            "text": text,
            "page": page_num,
            "start_char": current_char,
            "end_char": current_char + text_len
        })
        current_char += text_len + 2        
    return paragraphs

def parse_document(file_path: str) -> List[Dict[str, Any]]:
    """Global parser gateway choosing parser based on file extension."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return parse_pdf(file_path)
    elif ext == ".docx":
        return parse_docx(file_path)
    elif ext in [".txt", ".md", ".json"]:
        return parse_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")
