"""add material display order

Revision ID: a8c9d0e1f2a3
Revises: f7a8b9c0d1e2
"""

from alembic import op
import sqlalchemy as sa


revision = "a8c9d0e1f2a3"
down_revision = "f7a8b9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "materials",
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.execute("UPDATE materials SET display_order = id")
    op.create_index(
        "idx_materials_store_display_order",
        "materials",
        ["store_id", "display_order"],
    )


def downgrade() -> None:
    op.drop_index("idx_materials_store_display_order", table_name="materials")
    op.drop_column("materials", "display_order")
