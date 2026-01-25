import os
import sys

# Add the current directory to sys.path so we can import app
sys.path.append(os.getcwd())

from alembic.config import Config
from sqlmodel import SQLModel

from alembic import command

# Import models so SQLModel knows about them for drop_all
# Assuming models are imported in main or via app structure, 
# but best to import them here to be sure.
# Checking imports in app/main.py or app/services/db.py...
# I'll rely on what's available or try to import everything.
from app.services.db import engine
from app.services.vector_store import QdrantVectorStore
from app.settings import settings


def reset_postgres():
    print("Resetting Postgres (dropping all tables)...")
    # This drops all tables defined in SQLModel metadata
    # We might need to reflect existing tables if metadata doesn't know about them,
    # but for now let's try dropping what SQLModel knows.
    # Actually, a raw drop of public schema might be better if we really want to nuke it,
    # but let's stick to SQLModel first.
    SQLModel.metadata.drop_all(engine)
    
    print("Re-running migrations to recreate schema...")
    alembic_cfg = Config("alembic.ini")
    # stamp head just in case, or we need to make sure alembic table is gone too.
    # SQLModel drop_all should drop the alembic_version table IF it's in metadata? 
    # No, it's not.
    
    # We should probably drop the alembic_version table manually.
    with engine.connect() as conn:
        from sqlalchemy import text
        try:
            conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
            conn.commit()
        except Exception as e:
            print(f"Error dropping alembic_version: {e}")

    command.upgrade(alembic_cfg, "head")
    print("Postgres reset and migrated.")

def reset_qdrant():
    print(f"Resetting Qdrant collection: {settings.qdrant_collection}...")
    try:
        store = QdrantVectorStore(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
            collection=settings.qdrant_collection,
            dim=settings.embed_dim
        )
        # Delete the collection
        store.client.delete_collection(settings.qdrant_collection)
        print("Qdrant collection deleted.")
        
        # Re-create (happens automatically in init if not exists, so we just init)
        store = QdrantVectorStore(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
            collection=settings.qdrant_collection,
            dim=settings.embed_dim
        )
        print("Qdrant collection recreated.")
    except Exception as e:
        print(f"Error resetting Qdrant: {e}")

if __name__ == "__main__":
    reset_postgres()
    reset_qdrant()