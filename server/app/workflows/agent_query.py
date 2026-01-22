from __future__ import annotations

import json
import dataclasses
import inngest
import typing
import logging
from typing import Optional, Any, Literal
from pydantic import BaseModel
from inngest.experimental import ai
from sqlmodel import Session

from app.settings import settings
from app.workflows.inngest_app import get_inngest_client
from app.services.embeddings import OpenAIEmbedder
from app.services.vector_store import QdrantVectorStore
from app.services.db import engine
from app.services.repositories import DocumentRepo
from app.api.schemas import Citation

logger = logging.getLogger(__name__)

inngest_client = get_inngest_client()

embedder = OpenAIEmbedder(api_key=settings.openai_api_key, model=settings.embed_model)
# store = QdrantVectorStore(url=settings.qdrant_url, collection=settings.qdrant_collection, dim=settings.embed_dim)

adapter = ai.openai.Adapter(
    auth_key=settings.openai_api_key,
    model=settings.chat_model,
)


class AgenticRAGResult(BaseModel):
    intent: Literal["qa", "summarize", "extract", "clarify"]
    answer: str = ""
    citations: list[Citation] = []
    sources: list[str] = []
    needs_clarification: bool = False
    clarifying_question: Optional[str] = None
    num_contexts: int = 0


@inngest_client.create_function(
    fn_id="RAG: Agent Query (Grounded + Cited)",
    trigger=inngest.TriggerEvent(event="rag/agent_query"),
)
async def agent_query(ctx: inngest.Context):
    question = str(ctx.event.data.get("question") or "").strip()
    top_k = int(str(ctx.event.data.get("top_k", settings.default_top_k)))
    doc_id: Optional[str] = ctx.event.data.get("doc_id")
    folder_id: Optional[int] = ctx.event.data.get("folder_id")

    async def _retrieve():
        target_doc_ids: Optional[list[str]] = None
        is_folder_search = False
        
        logger.info(f"Agent Query: doc_id={doc_id}, folder_id={folder_id}")

        if doc_id:
            target_doc_ids = [doc_id]
        elif folder_id:
            is_folder_search = True
            with Session(engine) as session:
                docs = DocumentRepo(session).get_by_folder(folder_id)
                target_doc_ids = [d.doc_id for d in docs]
                logger.info(f"Found {len(target_doc_ids)} docs in folder {folder_id}: {target_doc_ids}")
                if not target_doc_ids:
                    # Folder empty
                    return []

        # Lazy init Qdrant
        store = QdrantVectorStore(url=settings.qdrant_url, collection=settings.qdrant_collection, dim=settings.embed_dim)
        
        qvec = embedder.embed([question])[0]
        
        if is_folder_search:
            # For folders, we want to search across all documents.
            # We use a higher top_k to ensure we capture enough context from potentially multiple documents.
            # We use standard search (not grouped) to allow the most relevant chunks to bubble up, 
            # even if they all come from the same document (which is better for specific QA).
            effective_top_k = max(top_k, 20)
            logger.info(f"Executing folder search with top_k={effective_top_k}...")
            chunks = store.search(qvec, top_k=effective_top_k, doc_ids=target_doc_ids)
        else:
            chunks = store.search(qvec, top_k=top_k, doc_ids=target_doc_ids)
            
        logger.info(f"Retrieved {len(chunks)} chunks.")
        unique_sources = {c.source for c in chunks}
        logger.info(f"Unique sources in chunks: {unique_sources}")

        return [dataclasses.asdict(c) for c in chunks]

    retrieved = await ctx.step.run("retrieve", _retrieve)

    if not retrieved:
        out = AgenticRAGResult(
            intent="clarify",
            needs_clarification=True,
            clarifying_question=(
                "I couldn’t find relevant content in your indexed PDFs. "
                "Try specifying doc_id (if you have many PDFs) or upload the correct file."
            ),
            num_contexts=0,
        )
        return out.model_dump()

    sources = sorted({c["source"] for c in retrieved if c.get("source")})

    context_pack = "\n\n".join(
        f"[chunk_id={c['chunk_id']} | source={c['source']} | page={c.get('page_number')} | chunk_index={c.get('chunk_index')}]\n{c['text']}"
        for c in retrieved
    )

    classify_prompt = f"""
Classify the user's request into one of:
- qa
- summarize
- extract
- clarify

User request:
{question}

Return ONLY JSON:
{{"intent":"qa"|"summarize"|"extract"|"clarify","clarifying_question":null|"..."}}.
""".strip()

    cls = await ctx.step.ai.infer(
        "classify-intent",
        adapter=adapter,
        body={
            "temperature": 0,
            "max_tokens": 200,
            "messages": [
                {"role": "system", "content": "Return only JSON."},
                {"role": "user", "content": classify_prompt},
            ],
        },
    )
    
    # Cast to Any or dict to avoid type errors with __getitem__
    cls_dict = typing.cast(dict[str, Any], cls)

    try:
        intent_obj = json.loads(cls_dict["choices"][0]["message"]["content"])
    except Exception:
        intent_obj = {"intent": "qa", "clarifying_question": None}

    intent = intent_obj.get("intent") or "qa"
    if intent == "clarify":
        out = AgenticRAGResult(
            intent="clarify",
            needs_clarification=True,
            clarifying_question=intent_obj.get("clarifying_question")
            or "What exactly do you want (answer vs summarize vs extract) and which PDF does it refer to?",
            sources=sources,
            num_contexts=len(retrieved),
        )
        return out.model_dump()

    gen_prompt = f"""
You must use ONLY the context below.
If the answer is not in the context, set needs_clarification=true and ask ONE clarifying question.

Context:
{context_pack}

User request:
{question}

Return ONLY JSON with:
- answer: string
- citations: array of {{"chunk_id":"...","source":"...","page_number":123,"quote":"..."}}
  - quote must be short (<= ~25 words)
- needs_clarification: boolean
- clarifying_question: string|null
""".strip()

    gen = await ctx.step.ai.infer(
        "generate-grounded",
        adapter=adapter,
        body={
            "temperature": 0.2,
            "max_tokens": 900,
            "messages": [
                {"role": "system", "content": "Return only JSON. No markdown."},
                {"role": "user", "content": gen_prompt},
            ],
        },
    )
    
    gen_dict = typing.cast(dict[str, Any], gen)

    raw = gen_dict["choices"][0]["message"]["content"]
    try:
        out_json = json.loads(raw)
    except Exception:
        out_json = {"answer": raw.strip(), "citations": [], "needs_clarification": False, "clarifying_question": None}

    out = AgenticRAGResult(
        intent=intent if intent in ("qa", "summarize", "extract") else "qa",
        answer=(out_json.get("answer") or "").strip(),
        citations=out_json.get("citations") or [],
        needs_clarification=bool(out_json.get("needs_clarification", False)),
        clarifying_question=out_json.get("clarifying_question"),
        sources=sources,
        num_contexts=len(retrieved),
    )
    return out.model_dump()