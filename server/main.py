import logging
import uuid
import os
import datetime
import json

from fastapi import FastAPI
import inngest
import inngest.fast_api
from inngest.experimental import ai
from dotenv import load_dotenv

from data_loader import load_and_chunk_pdf, embed_texts
from vector_db import QdrantStorage
from custom_types import (
    RAGSearchResult,
    RAGUpsertResult,
    RAGChunkAndSrc,
    AgenticRAGResult,
    RAGRetrievedChunk,
)

load_dotenv()

inngest_client = inngest.Inngest(
    app_id="docu_agent",
    logger=logging.getLogger("uvicorn"),
    is_production=False,
    serializer=inngest.PydanticSerializer(),
)


@inngest_client.create_function(
    fn_id="RAG: Inngest PDF",
    trigger=inngest.TriggerEvent(event="rag/inngest_pdf"),
    throttle=inngest.Throttle(limit=2, period=datetime.timedelta(minutes=1)),
    rate_limit=inngest.RateLimit(
        limit=1,
        period=datetime.timedelta(hours=4),
        key="event.data.source_id",
    ),
)

async def rag_inngest_pdf(ctx: inngest.Context):
    def _load(ctx: inngest.Context) -> RAGChunkAndSrc:
        pdf_path = ctx.event.data["pdf_path"]
        source_id = ctx.event.data.get("source_id", pdf_path)
        chunks = load_and_chunk_pdf(pdf_path)
        return RAGChunkAndSrc(chunks=chunks, source_id=source_id)

    def _upsert(chunks_and_src: RAGChunkAndSrc) -> RAGUpsertResult:
        chunks = chunks_and_src.chunks
        source_id = chunks_and_src.source_id

        vecs = embed_texts(chunks)
        
        ids = [
            str(uuid.uuid5(uuid.NAMESPACE_URL, f"{source_id}:{i}"))
            for i in range(len(chunks))
        ]
        
        payloads = [
            {"source": source_id, "text": chunks[i], "chunk_index": i}
            for i in range(len(chunks))
        ]

        QdrantStorage().upsert(ids, vecs, payloads)
        return RAGUpsertResult(ingested=len(chunks))

    chunks_and_src = await ctx.step.run(
        "load-and-chunk", lambda: _load(ctx), output_type=RAGChunkAndSrc
    )
    ingested = await ctx.step.run(
        "embed-and-upsert",
        lambda: _upsert(chunks_and_src),
        output_type=RAGUpsertResult,
    )
    return ingested.model_dump()

@inngest_client.create_function(
    fn_id="RAG: Query PDF",
    trigger=inngest.TriggerEvent(event="rag/query_pdf_ai"),
)
async def rag_query_pdf_ai(ctx: inngest.Context):
    def _search(question: str, top_k: int = 5) -> RAGSearchResult:
        query_vec = embed_texts([question])[0]
        store = QdrantStorage()
        found = store.search(query_vec, top_k)
        return RAGSearchResult(
            chunks=[
                RAGRetrievedChunk(**c) for c in found["chunks"]
            ],
            sources=found["sources"],
        )

    question = ctx.event.data["question"]
    top_k = int(ctx.event.data.get("top_k", 5))

    found = await ctx.step.run(
        "embed-and-search", lambda: _search(question, top_k), output_type=RAGSearchResult
    )
    
    context_block = "\n\n".join(f"- {c.text}" for c in found.chunks)

    user_content = (
        "Use the following context to answer the question.\n\n"
        f"Context:\n{context_block}\n\n"
        f"Question: {question}\n"
        "Answer concisely using the context above."
    )

    adapter = ai.openai.Adapter(
        auth_key=os.getenv("OPENAI_API_KEY"),
        model="gpt-4o-mini",
    )

    res = await ctx.step.ai.infer(
        "llm-answer",
        adapter=adapter,
        body={
            "max_tokens": 1024,
            "temperature": 0.2,
            "messages": [
                {"role": "system", "content": "You answer questions using only the provided context."},
                {"role": "user", "content": user_content},
            ],
        },
    )

    answer = res["choices"][0]["message"]["content"].strip()
    return {"answer": answer, "sources": found.sources, "num_contexts": len(found.chunks)}


@inngest_client.create_function(
    fn_id="RAG: Agentic Orchestrator",
    trigger=inngest.TriggerEvent(event="rag/agent_query"),
)
async def rag_agent_query(ctx: inngest.Context):
    question = (ctx.event.data.get("question") or "").strip()
    top_k = int(ctx.event.data.get("top_k", 6))

    adapter = ai.openai.Adapter(
        auth_key=os.getenv("OPENAI_API_KEY"),
        model="gpt-4o-mini",
    )

    def _retrieve(q: str, k: int) -> RAGSearchResult:
        query_vec = embed_texts([q])[0]
        found = QdrantStorage().search(query_vec, k)
        return RAGSearchResult(
            chunks=[RAGRetrievedChunk(**c) for c in found["chunks"]],
            sources=found["sources"],
        )

    retrieved = await ctx.step.run(
        "retrieve", lambda: _retrieve(question, top_k), output_type=RAGSearchResult
    )
    
    if len(retrieved.chunks) == 0:
        out = AgenticRAGResult(
            intent="clarify",
            needs_clarification=True,
            clarifying_question=(
                "I couldn’t find relevant content in your uploaded PDFs. "
                "Which document should I use, or can you upload the file/section that contains the answer?"
            ),
            answer="",
            citations=[],
            sources=[],
            num_contexts=0,
        )
        return out.model_dump()
    
    context_pack = "\n\n".join(
        f"[chunk_id={c.chunk_id} | source={c.source}]\n{c.text}"
        for c in retrieved.chunks
    )

    classify_prompt = f"""
You are a router for a document AI system.
Classify the user's request into one of:
- qa (answer a question)
- summarize (summarize document content relevant to the ask)
- extract (extract key points / requirements / entities relevant to the ask)
- clarify (you need more info / question is ambiguous)

User question:
{question}

Return ONLY valid JSON like:
{{"intent":"qa"|"summarize"|"extract"|"clarify","reason":"...","clarifying_question":null|"..."}}.
""".strip()

    cls = await ctx.step.ai.infer(
        "classify-intent",
        adapter=adapter,
        body={
            "temperature": 0,
            "max_tokens": 300,
            "messages": [
                {"role": "system", "content": "Return only JSON. No extra text."},
                {"role": "user", "content": classify_prompt},
            ],
        },
    )

    try:
        intent_obj = json.loads(cls["choices"][0]["message"]["content"])
    except Exception:
        intent_obj = {"intent": "qa", "reason": "fallback", "clarifying_question": None}

    intent = intent_obj.get("intent") or "qa"
    clarifying_q = intent_obj.get("clarifying_question")

    if intent == "clarify":
        out = AgenticRAGResult(
            intent="clarify",
            needs_clarification=True,
            clarifying_question=clarifying_q
            or "Can you clarify what you want (e.g., summarize vs extract), and which document this relates to?",
            answer="",
            citations=[],
            sources=retrieved.sources,
            num_contexts=len(retrieved.chunks),
        )
        return out.model_dump()
    
    gen_prompt = f"""
You must respond using ONLY the context below.
If the answer is not contained in the context, set needs_clarification=true and ask ONE clarifying question.

Context:
{context_pack}

User request:
{question}

Output JSON only with:
- answer: string
- citations: array of objects: {{"chunk_id":"...","source":"...","quote":"..."}}
  - quote must be a short excerpt (max ~25 words)
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

    raw = gen["choices"][0]["message"]["content"]

    try:
        out_json = json.loads(raw)
    except Exception:
        out_json = {
            "answer": raw.strip(),
            "citations": [],
            "needs_clarification": False,
            "clarifying_question": None,
        }

    out = AgenticRAGResult(
        intent=intent if intent in ("qa", "summarize", "extract") else "qa",
        answer=out_json.get("answer", "").strip(),
        citations=out_json.get("citations", []) or [],
        needs_clarification=bool(out_json.get("needs_clarification", False)),
        clarifying_question=out_json.get("clarifying_question"),
        sources=retrieved.sources,
        num_contexts=len(retrieved.chunks),
    )
    return out.model_dump()


app = FastAPI()
inngest.fast_api.serve(
    app,
    inngest_client,
    [
        rag_inngest_pdf,
        rag_query_pdf_ai,  
        rag_agent_query,   
    ],
)
