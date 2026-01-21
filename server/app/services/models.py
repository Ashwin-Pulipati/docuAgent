import datetime as dt
from typing import Optional, List

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Index


class Folder(SQLModel, table=True):
    __tablename__: str = "folders"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.now(dt.timezone.utc))
    
    documents: List["Document"] = Relationship(back_populates="folder")


class Document(SQLModel, table=True):
    __tablename__: str = "documents"

    id: Optional[int] = Field(default=None, primary_key=True)
    doc_id: str = Field(index=True, unique=True)  
    source_filename: str
    sha256: str = Field(index=True)

    storage_path: str
    size_bytes: int

    status: str = Field(default="uploaded")  
    ingested_chunks: int = Field(default=0)
    
    folder_id: Optional[int] = Field(default=None, foreign_key="folders.id")
    folder: Optional[Folder] = Relationship(back_populates="documents")

    created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.now(dt.timezone.utc))


Index("ix_documents_sha256", Document.sha256)