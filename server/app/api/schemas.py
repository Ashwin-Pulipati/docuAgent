from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal


class UploadResponse(BaseModel):
    doc_id: str
    created_new: bool
    ingest_event_id: str


class FolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class FolderUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class FolderResponse(BaseModel):
    id: int
    name: str
    created_at: str


class UpdateDocumentRequest(BaseModel):
    name: Optional[str] = None
    folder_id: Optional[int] = None


class QueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    top_k: int = Field(default=6, ge=1, le=20)
    doc_id: Optional[str] = None 
    folder_id: Optional[int] = None
    thread_id: Optional[int] = None # Optional for stateless queries, required for threaded


class QueryResponse(BaseModel):
    query_event_id: str


class JobStatusResponse(BaseModel):
    status: str
    output: Optional[dict] = None
    error: Optional[dict] = None
    run_id: Optional[str] = None


class Citation(BaseModel):
    chunk_id: str
    source: str
    quote: str = ""
    page_number: Optional[int] = None


class AgenticResult(BaseModel):
    intent: Literal["qa", "summarize", "extract", "clarify"]
    answer: str = ""
    citations: list[Citation] = []
    sources: List[str] = []
    needs_clarification: bool = False
    clarifying_question: Optional[str] = None
    num_contexts: int = 0


class ChatThreadCreate(BaseModel):
    title: Optional[str] = "New Chat"
    folder_id: Optional[int] = None
    document_id: Optional[int] = None
    parent_id: Optional[int] = None
    is_starred: bool = False


class ChatThreadUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=100)
    is_starred: Optional[bool] = None


class ReactionCreate(BaseModel):
    emoji: str


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    citations: Optional[List[Citation]] = None
    reactions: Optional[List[Dict[str, Any]]] = None
    created_at: str


class ChatThreadResponse(BaseModel):
    id: int
    title: str
    is_starred: bool
    folder_id: Optional[int]
    document_id: Optional[int]
    parent_id: Optional[int]
    created_at: str
    updated_at: str
    messages: List[ChatMessageResponse] = []