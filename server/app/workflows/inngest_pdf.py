from __future__ import annotations

import datetime
import uuid
import inngest
from pydantic import BaseModel
from sqlmodel import Session

from app.settings import settings
from app.workflows.inngest_app import get_inngest_client
from app.services.chunking import LlamaIndexChunker
from app.services.embeddings import OpenAIEmbedder
from app.services.vector_store import QdrantVectorStore
from app.services.storage import LocalStorage
from app.services.db import engine
from app.services.repositories import DocumentRepo

inngest_client = get_inngest_client()

chunker = LlamaIndexChunker()
embedder = OpenAIEmbedder(api_key=settings.openai_api_key, model=settings.embed_model)
store = QdrantVectorStore(url=settings.qdrant_url, collection=settings.qdrant_collection, dim=settings.embed_dim)
storage = LocalStorage(settings.uploads_dir)


class Chunked(BaseModel):
    doc_id: str
    source_id: str
    sha256: str
    pdf_path: str
    chunks: list[str]


class Upserted(BaseModel):
    ingested: int


@inngest_client.create_function(
    fn_id="RAG: Ingest PDF (Postgres + Qdrant)",
    trigger=inngest.TriggerEvent(event="rag/inngest_pdf"),
    throttle=inngest.Throttle(limit=2, period=datetime.timedelta(minutes=1)),
    rate_limit=inngest.RateLimit(
        limit=1,
        period=datetime.timedelta(hours=4),
        key="event.data.source_id",
    ),
)
async def inngest_pdf(ctx: inngest.Context):
    doc_id = str(ctx.event.data["doc_id"])

    async def _load_and_chunk() -> Chunked:
        pdf_path = str(ctx.event.data["pdf_path"])
        source_id = str(ctx.event.data.get("source_id", pdf_path))
        sha256 = str(ctx.event.data.get("sha256", ""))

        chunks = chunker.load_and_chunk_pdf(pdf_path)
        return Chunked(doc_id=doc_id, source_id=source_id, sha256=sha256, pdf_path=pdf_path, chunks=chunks)

    async def _embed_and_upsert(payload: Chunked) -> Upserted:
        vecs = embedder.embed(payload.chunks)
       
        ids = [str(uuid.uuid5(uuid.NAMESPACE_URL, f"{payload.doc_id}:{i}")) for i in range(len(payload.chunks))]

        payloads = [
            {
                "doc_id": payload.doc_id,
                "source": payload.source_id,
                "sha256": payload.sha256,
                "chunk_index": i,
                "text": payload.chunks[i],
            }
            for i in range(len(payload.chunks))
        ]

        store.upsert(ids, vecs, payloads)
        return Upserted(ingested=len(payload.chunks))

    try:
        chunked = await ctx.step.run("load-and-chunk", _load_and_chunk)
        upserted = await ctx.step.run("embed-and-upsert", lambda: _embed_and_upsert(chunked))
        
        with Session(engine) as session:
            DocumentRepo(session).mark_ingested(doc_id, upserted.ingested)
       
        if settings.delete_pdf_after_ingest:
            storage.delete(chunked.pdf_path)

        return {"doc_id": doc_id, "ingested": upserted.ingested}

    except Exception as e:
        with Session(engine) as session:
            DocumentRepo(session).mark_failed(doc_id)
        raise e
