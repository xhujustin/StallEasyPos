"""add product material display order

Revision ID: b9d0e1f2a3b4
Revises: a8c9d0e1f2a3
"""

from alembic import op
import sqlalchemy as sa


revision = "b9d0e1f2a3b4"
down_revision = "a8c9d0e1f2a3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "product_materials",
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.execute("UPDATE product_materials SET display_order = id")


def downgrade() -> None:
    op.drop_column("product_materials", "display_order")
