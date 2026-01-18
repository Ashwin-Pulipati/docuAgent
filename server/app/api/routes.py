from __future__ import annotations

from fastapi import APIRouter, UploadFile, File, HTTPException
import inngest
from sqlmodel import Session, select, col
from sqlalchemy import desc

from app.settings import settings
from app.workflows.inngest_app import get_inngest_client
from app.services.storage import LocalStorage
from app.services.jobs_client import InngestJobsClient
from app.services.db import engine
from app.services.models import Document
from app.services.repositories import DocumentRepo
from app.api.schemas import UploadResponse, QueryRequest, QueryResponse, JobStatusResponse

router = APIRouter()

storage = LocalStorage(settings.uploads_dir)
jobs = InngestJobsClient(settings.inngest_api_base)


@router.get("/health")
def health():
    return {"ok": True, "service": settings.app_name, "env": settings.env}


@router.post("/documents", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Only PDF uploads are supported.")

    file_bytes = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File too large. Max {settings.max_upload_mb} MB.")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is missing")

    stored = storage.save_pdf(file.filename, file_bytes)

    with Session(engine) as session:
        repo = DocumentRepo(session)
        doc_id, created_new = repo.create_or_get(
            source_filename=stored.filename,
            sha256=stored.sha256,
            storage_path=stored.path,
            size_bytes=stored.size_bytes,
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

    return UploadResponse(doc_id=doc_id, created_new=created_new, ingest_event_id=ingest_event_id)


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
        docs = session.exec(select(Document).order_by(desc(col(Document.created_at)))).all()
        return [{"doc_id": d.doc_id, "name": d.source_filename, "status": d.status} for d in docs]
