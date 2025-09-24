import os, shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from .models import UploadResp, IndexReq, QueryReq, ChatReq, SummarizeReq
from .ocr import extract_text
from .rag_service import index_doc, query, chat, summarize, DOC_STORE, CHAT_HISTORY

app = FastAPI(title="Smart Doc AI Assistant")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400,"Only PDF supported")
    path = os.path.join(UPLOAD_DIR,file.filename)
    with open(path,"wb") as f:
        shutil.copyfileobj(file.file,f)
    text = extract_text(path)
    preview = text[:500]
    return UploadResp(filename=file.filename, preview=preview)

@app.post("/index")
def index(req: IndexReq):
    if not req.doc_id or not req.text:
        raise HTTPException(400,"doc_id and text required")
    return JSONResponse(content=index_doc(req.doc_id, req.text))

@app.post("/query")
def q(req: QueryReq):
    if not req.question:
        raise HTTPException(400,"question required")
    return JSONResponse(content=query(req.question, k=req.k))

@app.post("/chat")
def c(req: ChatReq):
    if not req.user_id or not req.question:
        raise HTTPException(400,"user_id and question required")
    return JSONResponse(content=chat(req.user_id, req.question, doc_id=req.doc_id, k=req.k))

@app.post("/summarize")
def s(req: SummarizeReq):
    if not req.doc_id:
        raise HTTPException(400,"doc_id required")
    return JSONResponse(content=summarize(req.doc_id, max_len=req.max_len, k=req.k))

@app.get("/status")
def status():
    return {"ok":True,"docs":list(DOC_STORE.keys()),"sessions":len(CHAT_HISTORY)}
