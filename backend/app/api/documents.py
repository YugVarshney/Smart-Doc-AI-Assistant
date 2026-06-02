import os
import uuid
import shutil
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from backend.app.db.database import get_db
from backend.app.models.models import Document, DocumentChunk, KnowledgeGraph, Analytics, User
from backend.app.core.security import get_current_user
from backend.app.core.config import settings
from backend.app.services.rag_service import index_document_in_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["Documents"])

class DocumentResponse(BaseModel):
    id: str
    title: str
    filename: str
    file_type: str
    doc_size: int
    summary: Optional[str] = None
    tags: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class GraphNode(BaseModel):
    id: str
    label: str
    type: str

class GraphEdge(BaseModel):
    source: str
    target: str
    label: str

class KnowledgeGraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

class ParagraphResponse(BaseModel):
    text: str
    page: int
    start_char: int
    end_char: int

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pdf", ".docx", ".txt", ".md"]:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, DOCX, TXT, and Markdown files are supported."
        )
        
    doc_id = str(uuid.uuid4())
    save_filename = f"{doc_id}_{filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, save_filename)
    
    try:
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        logger.error(f"Failed to save file {filename}: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.")
        
    doc_size = os.path.getsize(file_path)
    
    db_doc = Document(
        id=doc_id,
        title=filename,
        filename=filename,
        file_type=ext.replace(".", ""),
        file_path=file_path,
        doc_size=doc_size,
        user_id=current_user.id
    )
    db.add(db_doc)
    
    analytics_record = Analytics(
        user_id=current_user.id,
        action_type="upload",
        details={"filename": filename, "doc_id": doc_id, "size": doc_size}
    )
    db.add(analytics_record)
    db.commit()
    
    background_tasks.add_task(index_document_in_db, db, doc_id, file_path)
    
    db.refresh(db_doc)
    return db_doc

@router.get("/", response_model=List[DocumentResponse])
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Document).filter(Document.user_id == current_user.id).order_by(Document.created_at.desc()).all()

@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc

@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            logger.error(f"Failed to delete file {doc.file_path}: {e}")
            
    db.delete(doc)
    
    analytics_record = Analytics(
        user_id=current_user.id,
        action_type="delete_document",
        details={"doc_id": doc_id}
    )
    db.add(analytics_record)
    db.commit()
    return None

@router.get("/{doc_id}/graph", response_model=KnowledgeGraphResponse)
def get_document_graph(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    graph = db.query(KnowledgeGraph).filter(KnowledgeGraph.document_id == doc_id).first()
    if not graph:
        return {"nodes": [], "edges": []}
    return {
        "nodes": graph.nodes,
        "edges": graph.edges
    }

@router.get("/{doc_id}/preview", response_model=List[ParagraphResponse])
def get_document_preview(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).order_by(DocumentChunk.chunk_index.asc()).all()
    
    preview = []
    for c in chunks:
        preview.append({
            "text": c.content,
            "page": c.page_number or 1,
            "start_char": c.start_char,
            "end_char": c.end_char
        })
    return preview

@router.get("/recommendations/list", response_model=List[DocumentResponse])
def get_similar_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Finds and recommends similar documents for the user based on tag overlap.
    """
    user_docs = db.query(Document).filter(Document.user_id == current_user.id).all()
    if not user_docs:
        return []
        
    all_tags = set()
    for d in user_docs:
        if d.tags:
            all_tags.update(d.tags)
            
    if not all_tags:
        return user_docs[:3]
        
    recommendations = []
    for d in user_docs:
        overlap = 0
        if d.tags:
            overlap = len(set(d.tags).intersection(all_tags))
        recommendations.append((d, overlap))
        
    recommendations.sort(key=lambda x: x[1], reverse=True)
    return [r[0] for r in recommendations[:5]]
