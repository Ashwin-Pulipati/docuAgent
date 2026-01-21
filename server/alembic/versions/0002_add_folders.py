"""add folders

Revision ID: 0002
Revises: 0001
Create Date: 2026-01-19 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create folders table
    op.create_table('folders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add folder_id to documents
    op.add_column('documents', sa.Column('folder_id', sa.Integer(), nullable=True))
    op.create_foreign_key(None, 'documents', 'folders', ['folder_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint(None, 'documents', type_='foreignkey')
    op.drop_column('documents', 'folder_id')
    op.drop_table('folders')
