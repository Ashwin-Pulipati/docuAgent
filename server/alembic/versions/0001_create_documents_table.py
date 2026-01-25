"""create documents table

Revision ID: 0001
Revises:
Create Date: 2026-01-08
"""

import sqlalchemy as sa

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("doc_id", sa.String(), nullable=False, unique=True),
        sa.Column("source_filename", sa.String(), nullable=False),
        sa.Column("sha256", sa.String(), nullable=False, unique=True),
        sa.Column("storage_path", sa.String(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="uploaded"),
        sa.Column("ingested_chunks", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_documents_doc_id", "documents", ["doc_id"])
    op.create_index("ix_documents_sha256", "documents", ["sha256"])


def downgrade() -> None:
    op.drop_index("ix_documents_sha256", table_name="documents")
    op.drop_index("ix_documents_doc_id", table_name="documents")
    op.drop_table("documents")
