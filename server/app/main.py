from __future__ import annotations

import inngest.fast_api
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.logging_config import setup_logging
from app.settings import settings
from app.workflows.agent_query import agent_query
from app.workflows.inngest_app import get_inngest_client
from app.workflows.inngest_pdf import inngest_pdf


def create_app() -> FastAPI:
    setup_logging(settings.log_level)

    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, restrict this to your frontend's domain
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)

    inngest.fast_api.serve(
        app,
        get_inngest_client(),
        [
            inngest_pdf,
            agent_query,
        ],
    )
    return app


app = create_app()
