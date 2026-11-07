"""add material inventory items and purchase history

Revision ID: 6a8d9f01b2c3
Revises: f58c2a7d9e10
"""

from alembic import op
import sqlalchemy as sa


revision = "6a8d9f01b2c3"
down_revision = "f58c2a7d9e10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "material_inventory_items",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("material_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("purchase_unit", sa.Text(), nullable=False),
        sa.Column("conversion_rate", sa.Numeric(14, 4), nullable=False),
        sa.Column("supplier", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["material_id"], ["materials.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("material_id", "name", name="uq_material_inventory_item_name"),
    )
    op.create_index("idx_material_inventory_items_material", "material_inventory_items", ["material_id"])
    op.create_table(
        "material_purchases",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("material_id", sa.BigInteger(), nullable=False),
        sa.Column("inventory_item_id", sa.BigInteger(), nullable=True),
        sa.Column("purchase_quantity", sa.Numeric(14, 4), nullable=False),
        sa.Column("purchase_unit", sa.Text(), nullable=False),
        sa.Column("conversion_rate", sa.Numeric(14, 4), nullable=False),
        sa.Column("base_quantity", sa.Numeric(14, 4), nullable=False),
        sa.Column("unit_price", sa.Numeric(14, 4), nullable=False),
        sa.Column("total_cost", sa.Numeric(14, 4), nullable=False),
        sa.Column("resulting_average_cost", sa.Numeric(14, 4), nullable=False),
        sa.Column("supplier", sa.Text(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("purchased_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["inventory_item_id"], ["material_inventory_items.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["material_id"], ["materials.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_material_purchases_material_date", "material_purchases", ["material_id", "purchased_at"])


def downgrade() -> None:
    op.drop_table("material_purchases")
    op.drop_table("material_inventory_items")
