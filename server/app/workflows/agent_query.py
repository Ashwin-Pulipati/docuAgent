from __future__ import annotations

import dataclasses
import json
import logging
import typing
from typing import Any, Literal

import inngest
from inngest.experimental import ai
from pydantic import BaseModel
from sqlmodel import Session

from app.api.schemas import Citation
from app.services.db import engine
from app.services.embeddings import OpenAIEmbedder
from app.services.repositories import ChatRepo, DocumentRepo
from app.services.vector_store import QdrantVectorStore
from app.settings import settings
from app.workflows.inngest_app import get_inngest_client

logger = logging.getLogger(__name__)

inngest_client = get_inngest_client()

embedder = OpenAIEmbedder(api_key=settings.openai_api_key, model=settings.embed_model)

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
    clarifying_question: str | None = None
    reaction: str | None = None
    message_id: int | None = None
    num_contexts: int = 0


def _retrieve_data(doc_id: str | None, folder_id: int | None, question: str, top_k: int) -> list[dict]:
    """
    Synchronous helper to retrieve relevant chunks from Qdrant.
    """
    target_sha256s: list[str] | None = None
    is_folder_search = False
    
    logger.info(f"Agent Query: doc_id={doc_id}, folder_id={folder_id}")

    with Session(engine) as session:
        repo = DocumentRepo(session)
        if doc_id:
            doc = repo.get_by_doc_id(doc_id)
            if doc:
                target_sha256s = [doc.sha256]
            else:
                return []
        elif folder_id:
            is_folder_search = True
            docs = repo.get_by_folder(folder_id)
            target_sha256s = list(set([d.sha256 for d in docs]))
            logger.info(f"Found {len(target_sha256s)} unique hashes in folder {folder_id}")
            if not target_sha256s:
                return []

    # Lazy init Qdrant
    store = QdrantVectorStore(
        url=settings.qdrant_url, 
        api_key=settings.qdrant_api_key,
        collection=settings.qdrant_collection, 
        dim=settings.embed_dim
    )
    
    qvec = embedder.embed([question])[0]
    
    if is_folder_search:
        effective_top_k = max(top_k, 20)
        logger.info(f"Executing folder search with top_k={effective_top_k}...")
        chunks = store.search(qvec, top_k=effective_top_k, sha256s=target_sha256s)
    else:
        chunks = store.search(qvec, top_k=top_k, sha256s=target_sha256s)
        
    logger.info(f"Retrieved {len(chunks)} chunks.")
    unique_sources = {c.source for c in chunks}
    logger.info(f"Unique sources in chunks: {unique_sources}")

    return [dataclasses.asdict(c) for c in chunks]


def _build_context_pack(retrieved: list[dict]) -> str:
    return "\n\n".join(
        f"[chunk_id={c['chunk_id']} | source={c['source']} | page={c.get('page_number')} | chunk_index={c.get('chunk_index')}]\n{c['text']}"
        for c in retrieved
    )


def _prepare_classify_prompt(question: str) -> str:
    return f"""
You are DocuAgent's intent classifier. Your job is to analyze the user's request and categorize it precisely.

Categories:
- \"qa\": The user is asking a specific question about facts, definitions, or details contained in the documents.
- \"summarize\": The user wants a high-level overview, summary, or condensation of a document or topic.
- \"extract\": The user wants specific data extracted in a structured format (e.g., \"list all dates\", \"find all tables\", \"extract the invoice number\").
- \"clarify\": The request is ambiguous, nonsensical, or cannot be answered without more specific information (e.g., \"Tell me about it\" without context).

User request:
{question}

Return ONLY JSON:
{{"intent": "qa" | "summarize" | "extract" | "clarify", "clarifying_question": null | "string"}}. 
If intent is "clarify", provide a polite `clarifying_question` to ask the user.
""".strip()


def _prepare_generation_prompt(question: str, context_pack: str, intent: str) -> str:
    intent_instruction = ""
    if intent == "summarize":
        intent_instruction = "Focus on providing a comprehensive yet concise overview. Capture the main themes and key points."
    elif intent == "extract":
        intent_instruction = "Focus on precision. List the extracted data clearly, preferably in bullet points or a structured format."
    else:  # qa
        intent_instruction = "Answer the question directly and accurately based on the evidence."

    return f"""
You are DocuAgent, an advanced AI research assistant.
Your goal is to answer the user's question using ONLY the provided context chunks.

Intent: {intent.upper()}
Instruction: {intent_instruction}

Guidelines:
1. **Groundedness**: Use ONLY the context below. Do not hallucinate. If the answer is not in the context, set `needs_clarification` to true.
2. **Citations**: You MUST cite your sources. Every distinct claim should have a citation pointing to the specific chunk.
3. **Tone**: Professional, helpful, and concise. Use Markdown for readability.
4. **Analysis**: Synthesize information from multiple chunks if necessary. Handle conflicts by noting the discrepancy.

Context:
{context_pack}

User request:
{question}

Return ONLY JSON with:
- answer: string (Markdown supported)
- citations: array of {{"chunk_id":"...","source":"...","page_number":123,"quote":"..."}}
  - quote must be short (<= ~25 words) and exact from the text.
- needs_clarification: boolean
- clarifying_question: string | null (Ask ONE specific question if context is missing)
- reaction: string | null (Any single emoji that reflects the nature of the answer/finding)
""".strip()


def _parse_intent(raw_response: dict[str, Any]) -> dict:
    try:
        content = raw_response["choices"][0]["message"]["content"]
        return json.loads(content)
    except Exception:
        return {"intent": "qa", "clarifying_question": None}


def _parse_generation(raw_response: dict[str, Any]) -> dict:
    raw = raw_response["choices"][0]["message"]["content"]
    try:
        return json.loads(raw)
    except Exception:
        return {
            "answer": raw.strip(), 
            "citations": [], 
            "needs_clarification": False, 
            "clarifying_question": None, 
            "reaction": None
        }


def _save_result_to_db(thread_id: int | None, out: AgenticRAGResult):
    if not thread_id:
        return

    with Session(engine) as session:
        repo = ChatRepo(session)
        final_content = out.clarifying_question if out.needs_clarification else out.answer
        
        # Ensure citations are serializable
        citations_data = [c.dict() if hasattr(c, "dict") else c for c in out.citations]
        agent_msg = repo.add_message(thread_id, "agent", final_content, citations=citations_data)
        out.message_id = agent_msg.id
        
        if out.reaction:
            messages = repo.get_messages(thread_id)
            # The agent message is the last one (index -1). The user message should be -2.
            if len(messages) >= 2:
                user_msg = messages[-2]
                if user_msg.role == "user":
                    repo.add_reaction(user_msg.id, out.reaction, role="agent")


@inngest_client.create_function(
    fn_id="RAG: Agent Query (Grounded + Cited)",
    trigger=inngest.TriggerEvent(event="rag/agent_query"),
)
async def agent_query(ctx: inngest.Context):
    question = str(ctx.event.data.get("question") or "").strip()
    top_k = int(str(ctx.event.data.get("top_k", settings.default_top_k)))
    doc_id: str | None = ctx.event.data.get("doc_id")
    folder_id: int | None = ctx.event.data.get("folder_id")
    thread_id: int | None = ctx.event.data.get("thread_id")

    # 1. Retrieve Context
    retrieved = await ctx.step.run(
        "retrieve", 
        lambda: _retrieve_data(doc_id, folder_id, question, top_k)
    )

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
        _save_result_to_db(thread_id, out)
        return out.model_dump()

    sources = sorted({c["source"] for c in retrieved if c.get("source")})
    context_pack = _build_context_pack(retrieved)

    # 2. Classify Intent
    cls_response = await ctx.step.ai.infer(
        "classify-intent",
        adapter=adapter,
        body={
            "temperature": 0,
            "max_tokens": 200,
            "messages": [
                {"role": "system", "content": "Return only JSON. No markdown."}, 
                {"role": "user", "content": _prepare_classify_prompt(question)},
            ],
        },
    )
    
    intent_data = _parse_intent(typing.cast(dict[str, Any], cls_response))
    intent = intent_data.get("intent") or "qa"

    if intent == "clarify":
        clarifying_q = intent_data.get("clarifying_question") or "What exactly do you want and which PDF does it refer to?"
        out = AgenticRAGResult(
            intent="clarify",
            needs_clarification=True,
            clarifying_question=clarifying_q,
            sources=sources,
            num_contexts=len(retrieved),
        )
        _save_result_to_db(thread_id, out)
        return out.model_dump()

    # 3. Generate Answer
    gen_response = await ctx.step.ai.infer(
        "generate-grounded",
        adapter=adapter,
        body={
            "temperature": 0.2,
            "max_tokens": 900,
            "messages": [
                {"role": "system", "content": "Return only JSON. No markdown."}, 
                {"role": "user", "content": _prepare_generation_prompt(question, context_pack, intent)},
            ],
        },
    )

    gen_data = _parse_generation(typing.cast(dict[str, Any], gen_response))

    # 4. Finalize & Save
    out = AgenticRAGResult(
        intent=intent if intent in ("qa", "summarize", "extract") else "qa",
        answer=(gen_data.get("answer") or "").strip(),
        citations=gen_data.get("citations") or [],
        needs_clarification=bool(gen_data.get("needs_clarification", False)),
        clarifying_question=gen_data.get("clarifying_question"),
        reaction=gen_data.get("reaction"),
        sources=sources,
        num_contexts=len(retrieved),
    )
    
    _save_result_to_db(thread_id, out)

    return out.model_dump()