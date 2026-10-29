"""add product display order

Revision ID: f58c2a7d9e10
Revises: d42e8f901ab3
"""

from alembic import op
import sqlalchemy as sa


revision = "f58c2a7d9e10"
down_revision = "d42e8f901ab3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.execute(
        """
        WITH ranked_products AS (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY id) AS row_number
            FROM products
        )
        UPDATE products
        SET display_order = ranked_products.row_number
        FROM ranked_products
        WHERE products.id = ranked_products.id
        """
    )
    op.create_index(
        "idx_products_store_display_order",
        "products",
        ["store_id", "display_order"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("idx_products_store_display_order", table_name="products")
    op.drop_column("products", "display_order")
