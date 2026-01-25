from __future__ import annotations

from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, create_engine

from app.settings import settings


def build_engine() -> Engine:
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is missing in .env")
    return create_engine(settings.database_url, pool_pre_ping=True)


engine: Engine = build_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def create_tables_dev_only() -> None:
    SQLModel.metadata.create_all(engine)
