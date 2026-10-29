"""reset order number per shift

Revision ID: d42e8f901ab3
Revises: a91c4d2e8f30
"""

from alembic import op
import sqlalchemy as sa


revision = "d42e8f901ab3"
down_revision = "a91c4d2e8f30"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("uq_orders_store_date_orderno", "orders", type_="unique")
    op.create_index(
        "uq_orders_store_shift_orderno",
        "orders",
        ["store_id", "shift_id", "order_no"],
        unique=True,
        postgresql_where=sa.text("shift_id IS NOT NULL"),
    )
    op.create_index(
        "uq_orders_store_date_orderno_without_shift",
        "orders",
        ["store_id", "business_date", "order_no"],
        unique=True,
        postgresql_where=sa.text("shift_id IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_orders_store_date_orderno_without_shift", table_name="orders")
    op.drop_index("uq_orders_store_shift_orderno", table_name="orders")
    op.create_unique_constraint(
        "uq_orders_store_date_orderno",
        "orders",
        ["store_id", "business_date", "order_no"],
    )
