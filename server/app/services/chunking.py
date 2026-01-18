from __future__ import annotations
from pathlib import Path

from llama_index.readers.file import PDFReader
from llama_index.core.node_parser import SentenceSplitter


class LlamaIndexChunker:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200) -> None:
        self.splitter = SentenceSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)

    def load_and_chunk_pdf(self, path: str) -> list[str]:
        docs = PDFReader().load_data(file=Path(path))
        texts = [d.text for d in docs if getattr(d, "text", None)]
        chunks: list[str] = []
        for t in texts:
            chunks.extend(self.splitter.split_text(t))
        return chunks
