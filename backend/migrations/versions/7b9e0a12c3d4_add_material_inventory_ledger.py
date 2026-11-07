"""add material inventory ledger

Revision ID: 7b9e0a12c3d4
Revises: 6a8d9f01b2c3
"""

from alembic import op
import sqlalchemy as sa


revision = "7b9e0a12c3d4"
down_revision = "6a8d9f01b2c3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "material_inventory_transactions",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("material_id", sa.BigInteger(), nullable=False),
        sa.Column("transaction_type", sa.Text(), nullable=False),
        sa.Column("quantity_change", sa.Numeric(14, 4), nullable=False),
        sa.Column("balance_before", sa.Numeric(14, 4), nullable=False),
        sa.Column("balance_after", sa.Numeric(14, 4), nullable=False),
        sa.Column("unit_cost_snapshot", sa.Numeric(14, 4), nullable=False),
        sa.Column("total_cost", sa.Numeric(14, 4), nullable=False),
        sa.Column("purchase_id", sa.BigInteger(), nullable=True),
        sa.Column("reference_type", sa.Text(), nullable=True),
        sa.Column("reference_id", sa.BigInteger(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["material_id"], ["materials.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["purchase_id"], ["material_purchases.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_material_inventory_transactions_material_date",
        "material_inventory_transactions",
        ["material_id", "created_at"],
    )
    # Establish an auditable starting point for materials that existed before
    # the ledger feature. Historical movements cannot be reconstructed safely.
    op.execute(
        """
        INSERT INTO material_inventory_transactions (
            material_id, transaction_type, quantity_change, balance_before,
            balance_after, unit_cost_snapshot, total_cost, note
        )
        SELECT
            id, 'OPENING_BALANCE', stock_quantity, 0,
            stock_quantity, unit_cost, stock_quantity * unit_cost,
            '啟用耗材履歷時的期初庫存'
        FROM materials
        WHERE stock_quantity <> 0
        """
    )


def downgrade() -> None:
    op.drop_table("material_inventory_transactions")
