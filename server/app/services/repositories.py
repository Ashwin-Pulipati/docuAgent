from __future__ import annotations

import datetime as dt
import uuid

from sqlmodel import Session, col, desc, select

from app.services.models import ChatMessage, ChatThread, Document, Folder


class FolderRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, name: str) -> Folder:
        folder = Folder(name=name)
        self.session.add(folder)
        self.session.commit()
        self.session.refresh(folder)
        return folder

    def list_all(self) -> list[Folder]:
        stmt = select(Folder).order_by(desc(col(Folder.created_at)))
        return self.session.exec(stmt).all()
    
    def get(self, folder_id: int) -> Folder | None:
        return self.session.get(Folder, folder_id)
        
    def delete(self, folder_id: int) -> list[Document]:
        folder = self.get(folder_id)
        docs_to_delete = []
        if folder:
            docs_to_delete = list(folder.documents)
            for doc in docs_to_delete:
                self.session.delete(doc)
            self.session.delete(folder)
            self.session.commit()
        return docs_to_delete

    def update(self, folder_id: int, name: str) -> Folder | None:
        folder = self.get(folder_id)
        if folder:
            folder.name = name
            self.session.add(folder)
            self.session.commit()
            self.session.refresh(folder)
        return folder


class DocumentRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_doc_id(self, doc_id: str) -> Document | None:
        stmt = select(Document).where(Document.doc_id == doc_id)
        return self.session.exec(stmt).first()

    def get_by_sha256(self, sha256: str) -> Document | None:
        stmt = select(Document).where(Document.sha256 == sha256)
        return self.session.exec(stmt).first()
    
    def get_by_folder(self, folder_id: int) -> list[Document]:
        stmt = select(Document).where(Document.folder_id == folder_id)
        return self.session.exec(stmt).all()

    def create_document(
        self,
        source_filename: str,
        sha256: str,
        storage_path: str,
        size_bytes: int,
        folder_id: int | None = None,
    ) -> tuple[str, bool]:
        # Check for existing document with same hash that is already ingested
        stmt = select(Document).where(Document.sha256 == sha256, Document.status == "ingested")
        existing = self.session.exec(stmt).first()

        doc_id = str(uuid.uuid4())
        
        if existing:
            # We found a twin! Skip ingestion and just point to the existing data.
            doc = Document(
                doc_id=doc_id,
                source_filename=source_filename,
                sha256=sha256,
                storage_path=storage_path, # We still keep the physical file or could link to twin's path
                size_bytes=size_bytes,
                status="ingested",
                ingested_chunks=existing.ingested_chunks,
                folder_id=folder_id,
            )
            self.session.add(doc)
            self.session.commit()
            self.session.refresh(doc)
            return doc.doc_id, False

        # No duplicate found or duplicate isn't ingested yet
        doc = Document(
            doc_id=doc_id,
            source_filename=source_filename,
            sha256=sha256,
            storage_path=storage_path,
            size_bytes=size_bytes,
            status="uploaded",
            folder_id=folder_id,
        )
        self.session.add(doc)
        self.session.commit()
        self.session.refresh(doc)
        return doc.doc_id, True

    def mark_ingested(self, doc_id: str, ingested_chunks: int) -> None:
        doc = self.get_by_doc_id(doc_id)
        if not doc:
            return
        doc.status = "ingested"
        doc.ingested_chunks = int(ingested_chunks)
        self.session.add(doc)
        self.session.commit()

    def mark_failed(self, doc_id: str) -> None:
        doc = self.get_by_doc_id(doc_id)
        if not doc:
            return
        doc.status = "failed"
        self.session.add(doc)
        self.session.commit()

    def update_filename(self, doc_id: str, new_name: str) -> Document | None:
        doc = self.get_by_doc_id(doc_id)
        if not doc:
            return None
        doc.source_filename = new_name
        self.session.add(doc)
        self.session.commit()
        self.session.refresh(doc)
        return doc

    def move_to_folder(self, doc_id: str, folder_id: int | None) -> Document | None:
        doc = self.get_by_doc_id(doc_id)
        if not doc:
            return None
        doc.folder_id = folder_id
        self.session.add(doc)
        self.session.commit()
        self.session.refresh(doc)
        return doc

    def delete(self, doc_id: str) -> Document | None:
        doc = self.get_by_doc_id(doc_id)
        if doc:
            self.session.delete(doc)
            self.session.commit()
        return doc


class ChatRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create_thread(self, title: str, folder_id: int | None = None, document_id: int | None = None, parent_id: int | None = None, is_starred: bool = False) -> ChatThread:
        thread = ChatThread(title=title, folder_id=folder_id, document_id=document_id, parent_id=parent_id, is_starred=is_starred)
        self.session.add(thread)
        self.session.commit()
        self.session.refresh(thread)
        return thread

    def get_thread(self, thread_id: int) -> ChatThread | None:
        return self.session.get(ChatThread, thread_id)

    def list_threads(self, folder_id: int | None = None, document_id: int | None = None) -> list[ChatThread]:
        stmt = select(ChatThread)
        
        if folder_id is not None:
            stmt = stmt.where(ChatThread.folder_id == folder_id)
        elif document_id is not None:
             stmt = stmt.where(ChatThread.document_id == document_id)
        else:
            # Root threads (folder_id is NULL) - this includes independent root chats AND chats attached to root documents
            stmt = stmt.where(ChatThread.folder_id == None)
            
        # We return all threads matching the context, frontend builds the tree using parent_id
        stmt = stmt.order_by(desc(ChatThread.updated_at))
        return self.session.exec(stmt).all()

    def update_thread(self, thread_id: int, title: str | None = None, is_starred: bool | None = None) -> ChatThread | None:
        thread = self.get_thread(thread_id)
        if thread:
            if title is not None:
                thread.title = title
            if is_starred is not None:
                thread.is_starred = is_starred
            thread.updated_at = dt.datetime.now(dt.UTC)
            self.session.add(thread)
            self.session.commit()
            self.session.refresh(thread)
        return thread

    def delete_thread(self, thread_id: int) -> None:
        thread = self.get_thread(thread_id)
        if thread:
            self.session.delete(thread)
            self.session.commit()

    def add_message(self, thread_id: int, role: str, content: str, citations: list[dict] | None = None) -> ChatMessage:
        msg = ChatMessage(thread_id=thread_id, role=role, content=content, citations=citations)
        self.session.add(msg)
        
        # Update thread updated_at
        thread = self.get_thread(thread_id)
        if thread:
            thread.updated_at = dt.datetime.now(dt.UTC)
            self.session.add(thread)
            
        self.session.commit()
        self.session.refresh(msg)
        return msg

    def add_reaction(self, message_id: int, emoji: str, role: str) -> ChatMessage | None:
        msg = self.session.get(ChatMessage, message_id)
        if not msg:
            return None
        
        reactions = list(msg.reactions) if msg.reactions else []
        
        # Check if this reaction exists
        found = False
        for r in reactions:
            if r["emoji"] == emoji:
                # Toggle logic: if user already reacted, remove it? 
                # The requirement is "add chat reactions". "Unstar" implies toggle.
                # Emoji pickers usually toggle.
                # We need to track who reacted. Since no auth, we assume "user" is one entity and "agent" is another.
                if role == "user":
                    if r.get("user_reacted"):
                        r["user_reacted"] = False
                        r["count"] -= 1
                    else:
                        r["user_reacted"] = True
                        r["count"] += 1
                elif role == "agent":
                    # Agent just adds, or we track agent_reacted?
                    # Let's track count.
                    r["count"] += 1
                
                if r["count"] <= 0:
                    reactions.remove(r)
                found = True
                break
        
        if not found:
            # Create new reaction
            new_reaction = {
                "emoji": emoji,
                "count": 1,
                "user_reacted": role == "user"
            }
            reactions.append(new_reaction)
            
        # SQLModel requires reassignment to detect JSON change if it's mutable
        msg.reactions = reactions
        self.session.add(msg)
        self.session.commit()
        self.session.refresh(msg)
        return msg

    def get_messages(self, thread_id: int) -> list[ChatMessage]:
        stmt = select(ChatMessage).where(ChatMessage.thread_id == thread_id).order_by(ChatMessage.created_at)
        return self.session.exec(stmt).all()
