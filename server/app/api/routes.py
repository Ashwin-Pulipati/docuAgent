from __future__ import annotations

from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
import inngest
from sqlmodel import Session, select
from sqlalchemy import desc

from app.settings import settings
from app.workflows.inngest_app import get_inngest_client
from app.services.storage import LocalStorage
from app.services.jobs_client import InngestJobsClient
from app.services.db import engine
from app.services.models import Document, Folder
from app.services.repositories import DocumentRepo, FolderRepo
from app.services.vector_store import QdrantVectorStore
from app.api.schemas import (
    UploadResponse, 
    QueryRequest, 
    QueryResponse, 
    JobStatusResponse,
    FolderCreate,
    FolderUpdate,
    FolderResponse,
    UpdateDocumentRequest
)

router = APIRouter()

storage = LocalStorage(settings.uploads_dir)
jobs = InngestJobsClient(settings.inngest_api_base)

def get_vector_store() -> QdrantVectorStore:
    return QdrantVectorStore(
        url=settings.qdrant_url, 
        collection=settings.qdrant_collection, 
        dim=settings.embed_dim
    )

@router.get("/health")
def health():
    return {"ok": True, "service": settings.app_name, "env": settings.env}

@router.post("/folders", response_model=FolderResponse)
def create_folder(req: FolderCreate):
    with Session(engine) as session:
        repo = FolderRepo(session)
        folder = repo.create(req.name)
        return FolderResponse(id=folder.id, name=folder.name, created_at=str(folder.created_at))

@router.patch("/folders/{folder_id}", response_model=FolderResponse)
def update_folder(folder_id: int, req: FolderUpdate):
    with Session(engine) as session:
        repo = FolderRepo(session)
        folder = repo.update(folder_id, req.name)
        if not folder:
             raise HTTPException(status_code=404, detail="Folder not found")
        return FolderResponse(id=folder.id, name=folder.name, created_at=str(folder.created_at))

@router.get("/folders", response_model=List[FolderResponse])
def list_folders():
    with Session(engine) as session:
        repo = FolderRepo(session)
        folders = repo.list_all()
        return [
            FolderResponse(id=f.id, name=f.name, created_at=str(f.created_at))
            for f in folders
        ]

@router.delete("/folders/{folder_id}")
def delete_folder(folder_id: int):
    with Session(engine) as session:
        repo = FolderRepo(session)
        deleted_docs = repo.delete(folder_id)
        
        vstore = get_vector_store()
        for doc in deleted_docs:
            try:
                vstore.delete_by_doc_id(doc.doc_id)
                storage.delete(doc.storage_path)
            except Exception:
                pass
                
    return {"ok": True}

@router.post("/documents", response_model=List[UploadResponse])
async def upload_documents(
    files: List[UploadFile] = File(...),
    folder_id: Optional[int] = Form(None),
    folder_name: Optional[str] = Form(None)
):
    if not folder_id and folder_name:
        with Session(engine) as session:
            stmt = select(Folder).where(Folder.name == folder_name)
            existing_folder = session.exec(stmt).first()
            if existing_folder:
                folder_id = existing_folder.id
            else:
                repo = FolderRepo(session)
                new_folder = repo.create(folder_name)
                folder_id = new_folder.id
    
    responses = []
    for file in files:
        if file.content_type not in ("application/pdf", "application/octet-stream"):
             raise HTTPException(status_code=400, detail=f"File {file.filename} is not a PDF.")

        file_bytes = await file.read()
        max_bytes = settings.max_upload_mb * 1024 * 1024
        if len(file_bytes) > max_bytes:
             raise HTTPException(status_code=413, detail=f"File {file.filename} too large. Max {settings.max_upload_mb} MB.")

        if not file.filename:
             raise HTTPException(status_code=400, detail="Filename is missing")

        if folder_id:
            with Session(engine) as session:
                folder = FolderRepo(session).get(folder_id)
                if not folder:
                    raise HTTPException(status_code=404, detail="Folder not found")
                
                docs = DocumentRepo(session).get_by_folder(folder_id)
                if len(docs) >= 10:
                    raise HTTPException(status_code=400, detail="Folder limit reached (max 10 files).")
                
                total_size = sum(d.size_bytes for d in docs) + len(file_bytes)
                if total_size > 2 * 1024 * 1024 * 1024:
                     raise HTTPException(status_code=400, detail="Folder size limit reached (max 2GB).")

        stored = storage.save_pdf(file.filename, file_bytes)

        with Session(engine) as session:
            repo = DocumentRepo(session)
            doc_id, created_new = repo.create_document(
                source_filename=stored.filename,
                sha256=stored.sha256,
                storage_path=stored.path,
                size_bytes=stored.size_bytes,
                folder_id=folder_id
            )

        ingest_event_id = "already_exists"
        if created_new:
            client = get_inngest_client()
            res = await client.send(
                inngest.Event(
                    name="rag/inngest_pdf",
                    data={
                        "doc_id": doc_id,
                        "pdf_path": stored.path,
                        "source_id": stored.filename,
                        "sha256": stored.sha256,
                    },
                )
            )
            ingest_event_id = res[0]
            
        responses.append(UploadResponse(doc_id=doc_id, created_new=created_new, ingest_event_id=ingest_event_id))

    return responses

@router.patch("/documents/{doc_id}")
def update_document(doc_id: str, req: UpdateDocumentRequest):
    with Session(engine) as session:
        repo = DocumentRepo(session)
        doc = repo.get_by_doc_id(doc_id)
        if not doc:
             raise HTTPException(status_code=404, detail="Document not found")
        
        if req.name is not None:
            if not req.name.strip() or not req.name.endswith(".pdf"):
                 raise HTTPException(status_code=400, detail="Invalid filename (must end in .pdf)")
            repo.update_filename(doc_id, req.name)
            
        updates = req.model_dump(exclude_unset=True)
        if "folder_id" in updates:
             fid = updates["folder_id"]
             if fid:
                 target_docs = repo.get_by_folder(fid)
                 if len(target_docs) >= 10:
                      raise HTTPException(status_code=400, detail="Target folder limit reached (max 10 files).")
             repo.move_to_folder(doc_id, fid)
             
    return {"ok": True}

@router.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    with Session(engine) as session:
        repo = DocumentRepo(session)
        doc = repo.delete(doc_id)
        if doc:
            try:
                get_vector_store().delete_by_doc_id(doc_id)
                storage.delete(doc.storage_path)
            except Exception:
                pass
    return {"ok": True}

@router.post("/query", response_model=QueryResponse)
async def query_agentic(req: QueryRequest):
    client = get_inngest_client()
    res = await client.send(
        inngest.Event(
            name="rag/agent_query",
            data={
                "question": req.question,
                "top_k": int(req.top_k),
                "doc_id": req.doc_id,
                "folder_id": req.folder_id,
            },
        )
    )
    return QueryResponse(query_event_id=res[0])

@router.get("/jobs/{event_id}", response_model=JobStatusResponse)
def job_status(event_id: str):
    run = jobs.get_latest_run(event_id)
    return JobStatusResponse(
        status=run.get("status") or "Unknown",
        output=run.get("output"),
        error=run.get("error"),
        run_id=run.get("run_id"),
    )

@router.get("/documents")
def list_documents():
    with Session(engine) as session:
        stmt = select(Document).order_by(desc(Document.created_at))
        docs = session.exec(stmt).all()
        return [
            {
                "doc_id": d.doc_id, 
                "name": d.source_filename, 
                "status": d.status, 
                "ingested_chunks": d.ingested_chunks,
                "folder_id": d.folder_id
            }
            for d in docs
        ]