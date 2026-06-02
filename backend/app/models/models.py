import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey, Table, PickleType, JSON
from sqlalchemy.orm import relationship
from backend.app.db.database import Base, is_sqlite

if is_sqlite:
    EmbeddingType = PickleType  # Fallback to pickled numpy array or list
else:
    from pgvector.sqlalchemy import Vector
    EmbeddingType = Vector(768)  # standard dimension for all-mpnet-base-v2 (768)

def generate_uuid():
    return str(uuid.uuid4())

chat_document_association = Table(
    "chat_document_association",
    Base.metadata,
    Column("chat_id", String(36), ForeignKey("chats.id", ondelete="CASCADE")),
    Column("document_id", String(36), ForeignKey("documents.id", ondelete="CASCADE"))
)

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")
    analytics = relationship("Analytics", back_populates="user", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_path = Column(String(512), nullable=False)
    doc_size = Column(Integer, nullable=False)
    summary = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)  # List of string tags
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    knowledge_graphs = relationship("KnowledgeGraph", back_populates="document", cascade="all, delete-orphan")
    chats = relationship("Chat", secondary=chat_document_association, back_populates="documents")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(EmbeddingType, nullable=True)
    page_number = Column(Integer, nullable=True)
    start_char = Column(Integer, nullable=False)
    end_char = Column(Integer, nullable=False)
    
    document = relationship("Document", back_populates="chunks")


class KnowledgeGraph(Base):
    __tablename__ = "knowledge_graphs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), unique=True, nullable=False)
    nodes = Column(JSON, nullable=False)  # List of entities: [{"id": "...", "label": "...", "type": "..."}]
    edges = Column(JSON, nullable=False)  # List of relationships: [{"source": "...", "target": "...", "label": "..."}]
    created_at = Column(DateTime, default=datetime.utcnow)
    
    document = relationship("Document", back_populates="knowledge_graphs")


class Chat(Base):
    __tablename__ = "chats"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_bookmarked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="chats")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")
    documents = relationship("Document", secondary=chat_document_association, back_populates="chats")


class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    chat_id = Column(String(36), ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    sources = Column(JSON, nullable=True)  # List of cited source chunk objects
    evaluation_metrics = Column(JSON, nullable=True)  # {"faithfulness": 0.95, "relevancy": 0.9, "context_precision": 0.8}
    created_at = Column(DateTime, default=datetime.utcnow)
    
    chat = relationship("Chat", back_populates="messages")


class Analytics(Base):
    __tablename__ = "analytics"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action_type = Column(String(100), nullable=False)  # "upload", "chat", "summarize", etc.
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="analytics")
