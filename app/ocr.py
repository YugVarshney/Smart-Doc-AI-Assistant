import os
from azure.ai.formrecognizer import DocumentAnalysisClient
from azure.core.credentials import AzureKeyCredential

ENDPOINT = os.getenv("AZURE_OCR_ENDPOINT")
KEY = os.getenv("AZURE_OCR_KEY")

def extract_text(pdf_path):
    client = DocumentAnalysisClient(endpoint=ENDPOINT, credential=AzureKeyCredential(KEY))
    with open(pdf_path, "rb") as f:
        poller = client.begin_analyze_document("prebuilt-read", f)
        res = poller.result()
    lines = []
    for page in getattr(res, "pages", []):
        for line in page.lines:
            lines.append(line.content)
    return "\n".join(lines)
