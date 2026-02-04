from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    app_name: str = "docagent_rag"
    env: str = Field(default="dev") 
    log_level: str = Field(default="INFO")
    
    uploads_dir: str = Field(default="data/uploads")
    delete_pdf_after_ingest: bool = Field(default=False)
    max_upload_mb: int = Field(default=25)
    
    inngest_app_id: str = Field(default="docu_agent")
    inngest_api_base: str = Field(default="http://127.0.0.1:8288/v1")
    
    openai_api_key: str = Field(default="")
    embed_model: str = Field(default="text-embedding-3-large")
    embed_dim: int = Field(default=3072)
    chat_model: str = Field(default="gpt-4o-mini")
    vision_model: str = Field(default="gpt-4o-mini")
    
    qdrant_url: str = Field(default="http://localhost:6333")
    qdrant_api_key: str = Field(default="")
    qdrant_collection: str = Field(default="docs")
    
    default_top_k: int = Field(default=6)
    
    database_url: str = Field(default="")
    
    clamav_host: str = Field(default="localhost")
    clamav_port: int = Field(default=3310)
    
    enable_malware_scanning: bool = Field(default=True)


settings = Settings()
