from __future__ import annotations

import datetime as dt
from typing import Optional

from sqlmodel import SQLModel, Field
from sqlalchemy import Index


class Document(SQLModel, table=True):
    __tablename__: str = "documents"

    id: Optional[int] = Field(default=None, primary_key=True)
    doc_id: str = Field(index=True, unique=True)  
    source_filename: str
    sha256: str = Field(index=True, unique=True)

    storage_path: str
    size_bytes: int

    status: str = Field(default="uploaded")  
    ingested_chunks: int = Field(default=0)

    created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.now(dt.timezone.utc))


Index("ix_documents_sha256", Document.sha256)
