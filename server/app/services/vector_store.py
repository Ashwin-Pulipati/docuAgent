from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct, Filter, FieldCondition, MatchValue

from app.domain.errors import VectorStoreError


@dataclass(frozen=True)
class RetrievedChunk:
    chunk_id: str
    source: str
    text: str
    doc_id: Optional[str] = None
    chunk_index: Optional[int] = None


class QdrantVectorStore:
    def __init__(self, url: str, collection: str, dim: int) -> None:
        self.client = QdrantClient(url=url, timeout=30)
        self.collection = collection
        try:
            if not self.client.collection_exists(self.collection):
                self.client.create_collection(
                    collection_name=self.collection,
                    vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
                )
        except Exception as e:
            raise VectorStoreError(f"Failed to init Qdrant: {e}") from e

    def upsert(self, ids: list[str], vectors: list[list[float]], payloads: list[dict]) -> None:
        try:
            points = [PointStruct(id=ids[i], vector=vectors[i], payload=payloads[i]) for i in range(len(ids))]
            self.client.upsert(self.collection, points=points)
        except Exception as e:
            raise VectorStoreError(f"Qdrant upsert failed: {e}") from e

    def search(self, query_vector: list[float], top_k: int, doc_id: Optional[str] = None) -> list[RetrievedChunk]:
        try:
            qfilter = None
            if doc_id:
                qfilter = Filter(
                    must=[FieldCondition(key="doc_id", match=MatchValue(value=doc_id))]
                )

            results = self.client.query_points(
                collection_name=self.collection,
                query=query_vector,
                with_payload=True,
                limit=top_k,
                query_filter=qfilter,
            ).points

            out: list[RetrievedChunk] = []
            for r in results:
                payload = getattr(r, "payload", None) or {}
                text = payload.get("text", "")
                if not text:
                    continue
                out.append(
                    RetrievedChunk(
                        chunk_id=str(getattr(r, "id", "")),
                        source=payload.get("source", ""),
                        text=text,
                        doc_id=payload.get("doc_id"),
                        chunk_index=payload.get("chunk_index"),
                    )
                )
            return out
        except Exception as e:
            raise VectorStoreError(f"Qdrant search failed: {e}") from e
