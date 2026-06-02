import logging
import json
import uuid
import io
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.app.db.database import get_db, SessionLocal
from backend.app.models.models import Chat, Message, Document, User, Analytics, chat_document_association
from backend.app.core.security import get_current_user
from backend.app.services.rag_service import generate_rag_response, evaluate_rag_quality

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chats", tags=["Chats"])

class ChatCreate(BaseModel):
    title: str
    document_ids: List[str]

class ChatResponse(BaseModel):
    id: str
    title: str
    is_bookmarked: bool
    created_at: datetime
    document_ids: List[str]

    class Config:
        from_attributes = True

class SourceInfo(BaseModel):
    citation_index: int
    chunk_id: str
    document_id: str
    filename: str
    content: str
    page_number: Optional[int] = None
    start_char: int
    end_char: int

class EvalMetrics(BaseModel):
    faithfulness: float
    relevancy: float
    context_precision: float

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    sources: Optional[List[SourceInfo]] = None
    evaluation_metrics: Optional[EvalMetrics] = None
    created_at: datetime

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    content: str

def background_evaluate_message(message_id: str, query: str, contexts: List[str], answer: str):
    db = SessionLocal()
    try:
        metrics = evaluate_rag_quality(query, contexts, answer)
        msg = db.query(Message).filter(Message.id == message_id).first()
        if msg:
            msg.evaluation_metrics = metrics
            db.commit()
    except Exception as e:
        logger.error(f"Failed RAG evaluation for message {message_id}: {e}")
    finally:
        db.close()

@router.post("/", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
def create_chat(
    chat_in: ChatCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    docs = db.query(Document).filter(
        Document.id.in_(chat_in.document_ids),
        Document.user_id == current_user.id
    ).all()
    
    if len(docs) != len(chat_in.document_ids):
        raise HTTPException(
            status_code=400,
            detail="One or more specified documents do not exist or do not belong to you."
        )
        
    db_chat = Chat(
        title=chat_in.title,
        user_id=current_user.id
    )
    db.add(db_chat)
    
    for doc in docs:
        db_chat.documents.append(doc)
        
    analytics_record = Analytics(
        user_id=current_user.id,
        action_type="create_chat",
        details={"chat_title": chat_in.title, "document_ids": chat_in.document_ids}
    )
    db.add(analytics_record)
    
    db.commit()
    db.refresh(db_chat)
    
    return ChatResponse(
        id=db_chat.id,
        title=db_chat.title,
        is_bookmarked=db_chat.is_bookmarked,
        created_at=db_chat.created_at,
        document_ids=[d.id for d in db_chat.documents]
    )

@router.get("/", response_model=List[ChatResponse])
def list_chats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chats = db.query(Chat).filter(Chat.user_id == current_user.id).order_by(Chat.created_at.desc()).all()
    res = []
    for c in chats:
        res.append(ChatResponse(
            id=c.id,
            title=c.title,
            is_bookmarked=c.is_bookmarked,
            created_at=c.created_at,
            document_ids=[d.id for d in c.documents]
        ))
    return res

@router.get("/{chat_id}/messages", response_model=List[MessageResponse])
def list_messages(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found.")
        
    return db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at.asc()).all()

@router.post("/{chat_id}/message", response_model=MessageResponse)
def post_message(
    chat_id: str,
    msg_in: MessageCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found.")
        
    doc_ids = [d.id for d in chat.documents]
    if not doc_ids:
        raise HTTPException(status_code=400, detail="No documents bound to this chat session.")
        
    result = generate_rag_response(db, msg_in.content, doc_ids, chat_id)
    msg_assistant = db.query(Message).filter(Message.id == result["message_id"]).first()
    
    contexts = [s["content"] for s in result["sources"]]
    background_tasks.add_task(
        background_evaluate_message,
        result["message_id"],
        msg_in.content,
        contexts,
        result["answer"]
    )
    
    analytics_record = Analytics(
        user_id=current_user.id,
        action_type="chat_query",
        details={"chat_id": chat_id, "doc_ids": doc_ids}
    )
    db.add(analytics_record)
    db.commit()
    
    return msg_assistant

@router.post("/{chat_id}/message/stream")
def stream_message_sse(
    chat_id: str,
    msg_in: MessageCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found.")
        
    doc_ids = [d.id for d in chat.documents]
    if not doc_ids:
        raise HTTPException(status_code=400, detail="No documents linked to this chat.")
        
    result = generate_rag_response(db, msg_in.content, doc_ids, chat_id)
    answer = result["answer"]
    sources = result["sources"]
    
    contexts = [s["content"] for s in sources]
    background_tasks.add_task(
        background_evaluate_message,
        result["message_id"],
        msg_in.content,
        contexts,
        answer
    )
    
    def event_stream():
        yield f"event: metadata\ndata: {json.dumps({'message_id': result['message_id'], 'sources': sources})}\n\n"
        
        chunk_size = 8
        for i in range(0, len(answer), chunk_size):
            chunk = answer[i:i + chunk_size]
            yield f"event: chunk\ndata: {json.dumps({'text': chunk})}\n\n"
            
        yield "event: end\ndata: [DONE]\n\n"
        
    return StreamingResponse(event_stream(), media_type="text/event-stream")

@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found.")
        
    db.delete(chat)
    db.commit()
    return None

@router.put("/{chat_id}/bookmark", response_model=ChatResponse)
def toggle_bookmark(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found.")
        
    chat.is_bookmarked = not chat.is_bookmarked
    db.commit()
    db.refresh(chat)
    return ChatResponse(
        id=chat.id,
        title=chat.title,
        is_bookmarked=chat.is_bookmarked,
        created_at=chat.created_at,
        document_ids=[d.id for d in chat.documents]
    )

@router.get("/{chat_id}/share", response_model=dict)
def generate_share_link(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found.")
        
    share_token = f"share_{chat_id}"
    return {"share_token": share_token, "share_url": f"/shared/{share_token}"}

@router.get("/shared/{share_token}", response_model=List[MessageResponse])
def view_shared_chat(
    share_token: str,
    db: Session = Depends(get_db)
):
    chat_id = share_token.replace("share_", "")
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Shared chat session not found.")
        
    return db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at.asc()).all()

@router.get("/{chat_id}/export")
def export_chat_pdf(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat = db.query(Chat).filter(Chat.id == chat_id, Chat.user_id == current_user.id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found.")
        
    messages = db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.created_at.asc()).all()
    
    pdf_buffer = io.BytesIO()
    
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=letter,
        rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=15
    )
    
    user_bubble_style = ParagraphStyle(
        'UserStyle',
        parent=styles['Normal'],
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=8,
        spaceBefore=8,
        leftIndent=15
    )
    
    assistant_bubble_style = ParagraphStyle(
        'AssistantStyle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        spaceAfter=12,
        spaceBefore=8
    )
    
    meta_style = ParagraphStyle(
        'MetaStyle',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#94A3B8')
    )
    
    elements = []
    
    elements.append(Paragraph(f"Chat Export: {chat.title}", title_style))
    elements.append(Paragraph(f"Exported on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", meta_style))
    elements.append(Spacer(1, 15))
    
    for m in messages:
        role = "YOU" if m.role == "user" else "ASSISTANT"
        role_color = '#2563EB' if m.role == 'user' else '#10B981'
        role_label = f"<b><font color='{role_color}'>{role}:</font></b>"
        
        elements.append(Paragraph(role_label, styles['Normal']))
        
        content_clean = m.content.replace("\n", "<br/>")
        
        style = user_bubble_style if m.role == "user" else assistant_bubble_style
        elements.append(Paragraph(content_clean, style))
        elements.append(Spacer(1, 5))
        
    doc.build(elements)
    
    pdf_buffer.seek(0)
    
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=chat_{chat_id}.pdf"}
    )
