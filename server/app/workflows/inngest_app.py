from __future__ import annotations

import logging

import inngest

from app.settings import settings

_inngest_client = inngest.Inngest(
    app_id=settings.inngest_app_id,
    logger=logging.getLogger("uvicorn"),
    is_production=(settings.env == "prod"),
    serializer=inngest.PydanticSerializer(),
)

def get_inngest_client() -> inngest.Inngest:
    return _inngest_client
