from __future__ import annotations

from fastapi import FastAPI
import inngest.fast_api

from app.settings import settings
from app.logging_config import setup_logging
from app.api.routes import router
from app.workflows.inngest_app import get_inngest_client
from app.workflows.inngest_pdf import inngest_pdf
from app.workflows.agent_query import agent_query


def create_app() -> FastAPI:
    setup_logging(settings.log_level)

    app = FastAPI(title=settings.app_name)
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
