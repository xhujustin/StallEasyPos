"""add shift expenses

Revision ID: d5b6c789e0f1
Revises: c4a5b678d9e0
"""
from alembic import op
import sqlalchemy as sa

revision = "d5b6c789e0f1"
down_revision = "c4a5b678d9e0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("shifts", sa.Column("total_expenses", sa.Numeric(10, 2), server_default="0", nullable=False))
    op.add_column("shifts", sa.Column("cash_expenses", sa.Numeric(10, 2), server_default="0", nullable=False))
    op.create_table(
        "shift_expenses",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("shift_id", sa.BigInteger(), sa.ForeignKey("shifts.id"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("category", sa.Text(), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("payment_method", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("supplier", sa.Text(), nullable=True),
        sa.Column("is_voided", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("voided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_shift_expenses_shift_id", "shift_expenses", ["shift_id"])


def downgrade() -> None:
    op.drop_index("ix_shift_expenses_shift_id", table_name="shift_expenses")
    op.drop_table("shift_expenses")
    op.drop_column("shifts", "cash_expenses")
    op.drop_column("shifts", "total_expenses")
