from __future__ import annotations

import uuid
from typing import Optional, Tuple

from sqlmodel import Session, select

from app.services.models import Document


class DocumentRepo:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_doc_id(self, doc_id: str) -> Optional[Document]:
        stmt = select(Document).where(Document.doc_id == doc_id)
        return self.session.exec(stmt).first()

    def get_by_sha256(self, sha256: str) -> Optional[Document]:
        stmt = select(Document).where(Document.sha256 == sha256)
        return self.session.exec(stmt).first()

    def create_or_get(
        self,
        source_filename: str,
        sha256: str,
        storage_path: str,
        size_bytes: int,
    ) -> Tuple[str, bool]:
        existing = self.get_by_sha256(sha256)
        if existing:
            return existing.doc_id, False

        doc = Document(
            doc_id=str(uuid.uuid4()),
            source_filename=source_filename,
            sha256=sha256,
            storage_path=storage_path,
            size_bytes=size_bytes,
            status="uploaded",
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
