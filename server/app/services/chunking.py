from __future__ import annotations

import asyncio

import fitz  # PyMuPDF
from llama_index.core.node_parser import SentenceSplitter

from app.services.vision import VisionService
from app.settings import settings


class LlamaIndexChunker:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200) -> None:
        self.splitter = SentenceSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        self.vision_service = VisionService(
            api_key=settings.openai_api_key, 
            model=settings.vision_model
        )

    async def _process_images(self, doc: fitz.Document, page: fitz.Page) -> list[str]:
        """
        Extracts and describes images from a PDF page.
        """
        image_list = page.get_images(full=True)
        image_tasks = []
        
        for img in image_list:
            xref = img[0]
            try:
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                width = base_image["width"]
                height = base_image["height"]
                
                # Skip small icons/logos
                if width < 150 or height < 150:
                    continue
                
                image_tasks.append(self.vision_service.describe_image(image_bytes))
            except Exception as e:
                print(f"Failed to extract image xref {xref}: {e}")

        if not image_tasks:
            return []

        descriptions = await asyncio.gather(*image_tasks)
        return [d for d in descriptions if d]

    async def _process_page(self, doc: fitz.Document, page_idx: int, sem: asyncio.Semaphore) -> list[dict]:
        """
        Process a single page: extract text + images, then chunk.
        """
        async with sem:
            try:
                # fitz is synchronous, but safe to access in single thread loop
                page = doc[page_idx]
                text = page.get_text()
                
                # Extract and describe images
                valid_descriptions = await self._process_images(doc, page)
                
                if valid_descriptions:
                    text += "\n\n" + "\n\n".join(
                        [f"--- [Image Description] ---\n{d}" for d in valid_descriptions]
                    )
                
                if not text.strip():
                    return []

                page_chunks = self.splitter.split_text(text)
                return [{
                    "text": c,
                    "page_number": page_idx + 1
                } for c in page_chunks]
            except Exception as e:
                print(f"Error processing page {page_idx + 1}: {e}")
                return []

    async def load_and_chunk_pdf(self, path: str) -> list[dict]:
        """
        Main entry point to load a PDF, process pages in parallel, and return chunks.
        """
        doc = fitz.open(path)
        
        # Limit concurrent page processing to avoid hitting rate limits
        sem = asyncio.Semaphore(5)

        try:
            tasks = [self._process_page(doc, i, sem) for i in range(len(doc))]
            results = await asyncio.gather(*tasks)
        finally:
            doc.close()
        
        # Flatten results
        chunk_dicts = []
        for r in results:
            chunk_dicts.extend(r)
            
        return chunk_dicts