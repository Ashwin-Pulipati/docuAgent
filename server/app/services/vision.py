from __future__ import annotations

import base64

from openai import AsyncOpenAI


class VisionService:
    def __init__(self, api_key: str, model: str) -> None:
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model

    async def describe_image(self, image_data: bytes) -> str:
        """
        Sends image bytes to the vision model and returns a description.
        """
        if not image_data:
            return ""
            
        base64_image = base64.b64encode(image_data).decode('utf-8')
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Describe this image in detail. Extract any text, data points from plots, or key information visible. If it's just a decorative element, ignore it."},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                },
                            },
                        ],
                    }
                ],
                max_tokens=1000,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            print(f"Error describing image: {e}")
            return ""