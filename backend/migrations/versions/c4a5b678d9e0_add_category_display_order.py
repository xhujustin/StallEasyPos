"""add category display order

Revision ID: c4a5b678d9e0
Revises: b3f4a567c8d9
"""
from alembic import op
import sqlalchemy as sa

revision = "c4a5b678d9e0"
down_revision = "b3f4a567c8d9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("categories", sa.Column("display_order", sa.Integer(), server_default="0", nullable=False))
    op.execute("""
        WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY name, id) AS position
            FROM categories
        )
        UPDATE categories SET display_order = ranked.position FROM ranked WHERE categories.id = ranked.id
    """)


def downgrade() -> None:
    op.drop_column("categories", "display_order")
