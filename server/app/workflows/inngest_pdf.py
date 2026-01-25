from __future__ import annotations

import uuid

import inngest
from pydantic import BaseModel
from sqlmodel import Session

from app.services.chunking import LlamaIndexChunker
from app.services.db import engine
from app.services.embeddings import OpenAIEmbedder
from app.services.repositories import DocumentRepo
from app.services.storage import LocalStorage
from app.services.vector_store import QdrantVectorStore
from app.settings import settings
from app.workflows.inngest_app import get_inngest_client

inngest_client = get_inngest_client()

chunker = LlamaIndexChunker()
embedder = OpenAIEmbedder(api_key=settings.openai_api_key, model=settings.embed_model)
storage = LocalStorage(settings.uploads_dir)


class Chunked(BaseModel):
    doc_id: str
    source_id: str
    sha256: str
    pdf_path: str
    chunks: list[str]
    chunk_metadatas: list[dict]


class Upserted(BaseModel):
    ingested: int


async def _load_and_chunk(doc_id: str, pdf_path: str, source_id: str, sha256: str) -> dict:
    """
    Asynchronous helper to load PDF and split into chunks.
    """
    chunk_dicts = await chunker.load_and_chunk_pdf(pdf_path)
    chunks = [c["text"] for c in chunk_dicts]
    metadatas = [{"page_number": c["page_number"]} for c in chunk_dicts]
    
    return Chunked(
        doc_id=doc_id, 
        source_id=source_id, 
        sha256=sha256, 
        pdf_path=pdf_path, 
        chunks=chunks,
        chunk_metadatas=metadatas
    ).model_dump()


def _embed_and_upsert(payload_dict: dict) -> dict:
    """
    Synchronous helper to embed chunks and upsert to Qdrant.
    """
    payload = Chunked.model_validate(payload_dict)
    
    if not payload.chunks:
        return Upserted(ingested=0).model_dump()

    # Lazy init Qdrant
    store = QdrantVectorStore(
        url=settings.qdrant_url, 
        api_key=settings.qdrant_api_key,
        collection=settings.qdrant_collection, 
        dim=settings.embed_dim
    )
    
    BATCH_SIZE = 100
    total_ingested = 0
    
    for i in range(0, len(payload.chunks), BATCH_SIZE):
        batch_chunks = payload.chunks[i : i + BATCH_SIZE]
        batch_metadatas = payload.chunk_metadatas[i : i + BATCH_SIZE]
        
        # Embed batch
        vecs = embedder.embed(batch_chunks)
        
        # Generate IDs and payloads for batch
        ids = []
        payloads = []
        
        for j, text in enumerate(batch_chunks):
            global_index = i + j
            # Create deterministic ID based on doc_id and index
            chunk_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{payload.doc_id}:{global_index}"))
            ids.append(chunk_id)
            
            payloads.append({
                "doc_id": payload.doc_id,
                "source": payload.source_id,
                "sha256": payload.sha256,
                "chunk_index": global_index,
                "text": text,
                "page_number": batch_metadatas[j]["page_number"]
            })

        # Upsert batch
        store.upsert(ids, vecs, payloads)
        total_ingested += len(batch_chunks)

    return Upserted(ingested=total_ingested).model_dump()


@inngest_client.create_function(
    fn_id="RAG: Ingest PDF (Postgres + Qdrant)",
    trigger=inngest.TriggerEvent(event="rag/inngest_pdf"),
)
async def inngest_pdf(ctx: inngest.Context):
    doc_id = str(ctx.event.data["doc_id"])
    pdf_path = str(ctx.event.data["pdf_path"])
    source_id = str(ctx.event.data.get("source_id", pdf_path))
    sha256 = str(ctx.event.data.get("sha256", ""))

    try:
        chunked = await ctx.step.run(
            "load-and-chunk", 
            lambda: _load_and_chunk(doc_id, pdf_path, source_id, sha256)
        )
        
        upserted = await ctx.step.run(
            "embed-and-upsert", 
            lambda: _embed_and_upsert(chunked)
        )
        
        with Session(engine) as session:
            DocumentRepo(session).mark_ingested(doc_id, upserted["ingested"])
       
        if settings.delete_pdf_after_ingest:
            storage.delete(chunked["pdf_path"])

        return {"doc_id": doc_id, "ingested": upserted["ingested"]}

    except Exception as e:
        with Session(engine) as session:
            DocumentRepo(session).mark_failed(doc_id)
        raise e