from __future__ import annotations

import uuid
from typing import Optional, Tuple, List

from sqlmodel import Session, select, desc, col

from app.services.models import Document, Folder


class FolderRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, name: str) -> Folder:
        folder = Folder(name=name)
        self.session.add(folder)
        self.session.commit()
        self.session.refresh(folder)
        return folder

    def list_all(self) -> List[Folder]:
        stmt = select(Folder).order_by(desc(col(Folder.created_at)))
        return self.session.exec(stmt).all()
    
    def get(self, folder_id: int) -> Optional[Folder]:
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

    def update(self, folder_id: int, name: str) -> Optional[Folder]:
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

    def get_by_doc_id(self, doc_id: str) -> Optional[Document]:
        stmt = select(Document).where(Document.doc_id == doc_id)
        return self.session.exec(stmt).first()

    def get_by_sha256(self, sha256: str) -> Optional[Document]:
        stmt = select(Document).where(Document.sha256 == sha256)
        return self.session.exec(stmt).first()
    
    def get_by_folder(self, folder_id: int) -> List[Document]:
        stmt = select(Document).where(Document.folder_id == folder_id)
        return self.session.exec(stmt).all()

    def create_document(
        self,
        source_filename: str,
        sha256: str,
        storage_path: str,
        size_bytes: int,
        folder_id: Optional[int] = None,
    ) -> Tuple[str, bool]:
        doc = Document(
            doc_id=str(uuid.uuid4()),
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

    def update_filename(self, doc_id: str, new_name: str) -> Optional[Document]:
        doc = self.get_by_doc_id(doc_id)
        if not doc:
            return None
        doc.source_filename = new_name
        self.session.add(doc)
        self.session.commit()
        self.session.refresh(doc)
        return doc

    def move_to_folder(self, doc_id: str, folder_id: Optional[int]) -> Optional[Document]:
        doc = self.get_by_doc_id(doc_id)
        if not doc:
            return None
        doc.folder_id = folder_id
        self.session.add(doc)
        self.session.commit()
        self.session.refresh(doc)
        return doc

    def delete(self, doc_id: str) -> Optional[Document]:
        doc = self.get_by_doc_id(doc_id)
        if doc:
            self.session.delete(doc)
            self.session.commit()
        return doc