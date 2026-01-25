import datetime as dt
from typing import Optional

from sqlalchemy import Column, Index
from sqlmodel import JSON, Field, Relationship, SQLModel


class Folder(SQLModel, table=True):
    __tablename__: str = "folders"
    
    id: int | None = Field(default=None, primary_key=True)
    name: str
    created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.now(dt.UTC))
    
    documents: list["Document"] = Relationship(back_populates="folder")
    chat_threads: list["ChatThread"] = Relationship(back_populates="folder")


class Document(SQLModel, table=True):
    __tablename__: str = "documents"

    id: int | None = Field(default=None, primary_key=True)
    doc_id: str = Field(index=True, unique=True)  
    source_filename: str
    sha256: str = Field(index=True)

    storage_path: str
    size_bytes: int

    status: str = Field(default="uploaded")  
    ingested_chunks: int = Field(default=0)
    
    folder_id: int | None = Field(default=None, foreign_key="folders.id")
    folder: Folder | None = Relationship(back_populates="documents")

    chat_threads: list["ChatThread"] = Relationship(back_populates="document")

    created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.now(dt.UTC))


class ChatThread(SQLModel, table=True):
    __tablename__: str = "chat_threads"

    id: int | None = Field(default=None, primary_key=True)
    title: str
    
    folder_id: int | None = Field(default=None, foreign_key="folders.id")
    folder: Folder | None = Relationship(back_populates="chat_threads")

    document_id: int | None = Field(default=None, foreign_key="documents.id")
    document: Optional["Document"] = Relationship(back_populates="chat_threads")
    
    parent_id: int | None = Field(default=None, foreign_key="chat_threads.id")
    
    parent: Optional["ChatThread"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={
            "remote_side": "ChatThread.id"
        }
    )

    children: list["ChatThread"] = Relationship(
        back_populates="parent",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan"
        }
    )

    is_starred: bool = Field(default=False)

    messages: list["ChatMessage"] = Relationship(back_populates="thread", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

    created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.now(dt.UTC))
    updated_at: dt.datetime = Field(default_factory=lambda: dt.datetime.now(dt.UTC))


class ChatMessage(SQLModel, table=True):
    __tablename__: str = "chat_messages"

    id: int | None = Field(default=None, primary_key=True)
    
    thread_id: int = Field(foreign_key="chat_threads.id")
    thread: ChatThread | None = Relationship(back_populates="messages")
    
    role: str # "user" or "agent"
    content: str
    
    # Store citations as a list of JSON objects
    citations: list[dict] | None = Field(default=None, sa_column=Column(JSON))
    
    # Store reactions as a list of JSON objects: [{"emoji": "👍", "count": 1, "user_reacted": true}]
    reactions: list[dict] | None = Field(default=None, sa_column=Column(JSON))

    created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.now(dt.UTC))


Index("ix_documents_sha256", Document.sha256)
