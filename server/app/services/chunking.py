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

    async def load_and_chunk_pdf(self, path: str) -> list[dict]:
        doc = fitz.open(path)
        
        # Limit concurrent page processing to avoid hitting rate limits too hard
        sem = asyncio.Semaphore(5)

        async def _process_page(page_idx: int) -> list[dict]:
            async with sem:
                try:
                    # fitz (PyMuPDF) is synchronous, but we are in a single thread,
                    # so accessing doc[i] is safe as long as we don't close it.
                    page = doc[page_idx]
                    text = page.get_text()
                    
                    # Process Images
                    image_list = page.get_images(full=True)
                    image_tasks = []
                    
                    for img in image_list:
                        xref = img[0]
                        try:
                            base_image = doc.extract_image(xref)
                            image_bytes = base_image["image"]
                            width = base_image["width"]
                            height = base_image["height"]
                            
                            if width < 150 or height < 150:
                                continue
                            
                            image_tasks.append(self.vision_service.describe_image(image_bytes))
                        except Exception as e:
                            print(f"Failed to extract image xref {xref}: {e}")

                    if image_tasks:
                        # Process images for this page in parallel
                        descriptions = await asyncio.gather(*image_tasks)
                        valid_descriptions = [d for d in descriptions if d]
                        
                        if valid_descriptions:
                            text += "\n\n" + "\n\n".join([f"--- [Image Description] ---\n{d}" for d in valid_descriptions])
                    
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

        tasks = [_process_page(i) for i in range(len(doc))]
        results = await asyncio.gather(*tasks)
        
        doc.close()
        
        # Flatten results
        chunk_dicts = []
        for r in results:
            chunk_dicts.extend(r)
            
        return chunk_dicts

        tasks = [_process_page(i) for i in range(len(doc))]
        results = await asyncio.gather(*tasks)
        
        doc.close()
        
        # Flatten results
        chunk_dicts = []
        for r in results:
            chunk_dicts.extend(r)
            
        return chunk_dicts
