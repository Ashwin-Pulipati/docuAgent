from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


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
    name: str | None = None
    folder_id: int | None = None


class QueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    top_k: int = Field(default=6, ge=1, le=20)
    doc_id: str | None = None 
    folder_id: int | None = None
    thread_id: int | None = None # Optional for stateless queries, required for threaded


class QueryResponse(BaseModel):
    query_event_id: str


class JobStatusResponse(BaseModel):
    status: str
    output: dict | None = None
    error: dict | None = None
    run_id: str | None = None


class Citation(BaseModel):
    chunk_id: str
    source: str
    quote: str = ""
    page_number: int | None = None


class AgenticResult(BaseModel):
    intent: Literal["qa", "summarize", "extract", "clarify"]
    answer: str = ""
    citations: list[Citation] = []
    sources: list[str] = []
    needs_clarification: bool = False
    clarifying_question: str | None = None
    num_contexts: int = 0


class ChatThreadCreate(BaseModel):
    title: str | None = "New Chat"
    folder_id: int | None = None
    document_id: int | None = None
    parent_id: int | None = None
    is_starred: bool = False


class ChatThreadUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=100)
    is_starred: bool | None = None


class ReactionCreate(BaseModel):
    emoji: str


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    citations: list[Citation] | None = None
    reactions: list[dict[str, Any]] | None = None
    created_at: str


class ChatThreadResponse(BaseModel):
    id: int
    title: str
    is_starred: bool
    folder_id: int | None
    document_id: int | None
    parent_id: int | None
    created_at: str
    updated_at: str
    messages: list[ChatMessageResponse] = []