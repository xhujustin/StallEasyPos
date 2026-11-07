"""add product and order item skip printing flags

Revision ID: f7a8b9c0d1e2
Revises: e6c7d890f1a2
"""

from alembic import op
import sqlalchemy as sa


revision = "f7a8b9c0d1e2"
down_revision = "e6c7d890f1a2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("skip_printing", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "order_items",
        sa.Column("skip_printing", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("order_items", "skip_printing")
    op.drop_column("products", "skip_printing")
