from __future__ import annotations
from pathlib import Path

from llama_index.readers.file import PDFReader
from llama_index.core.node_parser import SentenceSplitter


class LlamaIndexChunker:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200) -> None:
        self.splitter = SentenceSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)

    def load_and_chunk_pdf(self, path: str) -> list[dict]:
        docs = PDFReader().load_data(file=Path(path))
        chunk_dicts: list[dict] = []
        
        for i, d in enumerate(docs):
            if not getattr(d, "text", None):
                continue
                
            # Try to get page number from metadata, fallback to index + 1
            # PDFReader typically stores it in extra_info or metadata with key like 'page_label'
            metadata = getattr(d, "metadata", {}) or getattr(d, "extra_info", {}) or {}
            page_num = metadata.get("page_label") or (i + 1)
            
            page_chunks = self.splitter.split_text(d.text)
            for c in page_chunks:
                chunk_dicts.append({
                    "text": c,
                    "page_number": int(page_num) if str(page_num).isdigit() else i + 1
                })
                
        return chunk_dicts
