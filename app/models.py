from pydantic import BaseModel
from typing import Optional

class UploadResp(BaseModel):
    filename: str
    preview: str

class IndexReq(BaseModel):
    doc_id: str
    text: str

class QueryReq(BaseModel):
    question: str
    k: int = 5
    user_id: Optional[str] = None

class ChatReq(BaseModel):
    user_id: str
    question: str
    doc_id: Optional[str] = None
    k: int = 5

class SummarizeReq(BaseModel):
    doc_id: str
    max_len: int = 300
    k: int = 20
