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


class AgenticResult(BaseModel):
    intent: Literal["qa", "summarize", "extract", "clarify"]
    answer: str = ""
    citations: list[Citation] = []
    sources: List[str] = []
    needs_clarification: bool = False
    clarifying_question: Optional[str] = None
    num_contexts: int = 0
