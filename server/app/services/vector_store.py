from __future__ import annotations

from dataclasses import dataclass

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchAny,
    MatchValue,
    PointStruct,
    VectorParams,
)

from app.domain.errors import VectorStoreError


@dataclass(frozen=True)
class RetrievedChunk:
    chunk_id: str
    source: str
    text: str
    doc_id: str | None = None
    chunk_index: int | None = None
    page_number: int | None = None


class QdrantVectorStore:
    def __init__(self, url: str, collection: str, dim: int, api_key: str | None = None) -> None:
        self.client = QdrantClient(url=url, api_key=api_key, timeout=30)
        self.collection = collection
        try:
            if not self.client.collection_exists(self.collection):
                self.client.create_collection(
                    collection_name=self.collection,
                    vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
                )
            self.ensure_indices()
        except Exception as e:
            raise VectorStoreError(f"Failed to init Qdrant: {e}") from e

    def ensure_indices(self) -> None:
        try:
            self.client.create_payload_index(
                collection_name=self.collection,
                field_name="doc_id",
                field_schema="keyword",
            )
            self.client.create_payload_index(
                collection_name=self.collection,
                field_name="sha256",
                field_schema="keyword",
            )
        except Exception:
            pass

    def upsert(self, ids: list[str], vectors: list[list[float]], payloads: list[dict]) -> None:
        try:
            points = [PointStruct(id=ids[i], vector=vectors[i], payload=payloads[i]) for i in range(len(ids))]
            self.client.upsert(self.collection, points=points)
        except Exception as e:
            raise VectorStoreError(f"Qdrant upsert failed: {e}") from e

    def delete_by_doc_id(self, doc_id: str) -> None:
        try:
            self.client.delete(
                collection_name=self.collection,
                points_selector=Filter(
                    must=[FieldCondition(key="doc_id", match=MatchValue(value=doc_id))]
                ),
            )
        except Exception as e:
            raise VectorStoreError(f"Qdrant delete failed: {e}") from e

    def search(self, query_vector: list[float], top_k: int, doc_ids: list[str] | None = None, sha256s: list[str] | None = None) -> list[RetrievedChunk]:
        try:
            must_filters = []
            if doc_ids:
                if len(doc_ids) == 1:
                     must_filters.append(FieldCondition(key="doc_id", match=MatchValue(value=doc_ids[0])))
                else:
                     must_filters.append(FieldCondition(key="doc_id", match=MatchAny(any=doc_ids)))
            
            if sha256s:
                if len(sha256s) == 1:
                     must_filters.append(FieldCondition(key="sha256", match=MatchValue(value=sha256s[0])))
                else:
                     must_filters.append(FieldCondition(key="sha256", match=MatchAny(any=sha256s)))

            qfilter = Filter(must=must_filters) if must_filters else None

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
                        page_number=payload.get("page_number"),
                    )
                )
            return out
        except Exception as e:
            raise VectorStoreError(f"Qdrant search failed: {e}") from e

    def search_grouped(self, query_vector: list[float], top_k_groups: int, group_size: int, doc_ids: list[str] | None = None, sha256s: list[str] | None = None) -> list[RetrievedChunk]:
        try:
            must_filters = []
            if doc_ids:
                if len(doc_ids) == 1:
                     must_filters.append(FieldCondition(key="doc_id", match=MatchValue(value=doc_ids[0])))
                else:
                     must_filters.append(FieldCondition(key="doc_id", match=MatchAny(any=doc_ids)))

            if sha256s:
                if len(sha256s) == 1:
                     must_filters.append(FieldCondition(key="sha256", match=MatchValue(value=sha256s[0])))
                else:
                     must_filters.append(FieldCondition(key="sha256", match=MatchAny(any=sha256s)))

            qfilter = Filter(must=must_filters) if must_filters else None

            groups = self.client.query_points_groups(
                collection_name=self.collection,
                query=query_vector,
                group_by="sha256", # Group by content hash since multiple docs might share it
                limit=top_k_groups,
                group_size=group_size,
                query_filter=qfilter,
                with_payload=True,
            ).groups

            out: list[RetrievedChunk] = []
            for g in groups:
                for r in g.hits:
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
                            page_number=payload.get("page_number"),
                        )
                    )
            return out
        except Exception as e:
            raise VectorStoreError(f"Qdrant search groups failed: {e}") from e