"""add daily shift number

Revision ID: a91c4d2e8f30
Revises: f3b28d7a91c4
"""

from alembic import op
import sqlalchemy as sa


revision = "a91c4d2e8f30"
down_revision = "f3b28d7a91c4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("shifts", sa.Column("shift_number", sa.BigInteger(), nullable=True))
    op.execute(
        """
        WITH numbered AS (
            SELECT id,
                   to_char(start_time AT TIME ZONE 'Asia/Taipei', 'YYYYMMDD')::bigint * 1000
                   + row_number() OVER (
                       PARTITION BY store_id, (start_time AT TIME ZONE 'Asia/Taipei')::date
                       ORDER BY start_time, id
                   ) AS shift_number
            FROM shifts
        )
        UPDATE shifts AS shifts_table
        SET shift_number = numbered.shift_number
        FROM numbered
        WHERE shifts_table.id = numbered.id
        """
    )
    op.alter_column("shifts", "shift_number", nullable=False)
    op.create_index("ix_shifts_shift_number", "shifts", ["shift_number"])
    op.create_unique_constraint(
        "uq_shifts_store_shift_number", "shifts", ["store_id", "shift_number"]
    )

    op.add_column("orders", sa.Column("shift_number", sa.BigInteger(), nullable=True))
    op.execute(
        """
        UPDATE orders
        SET shift_number = shifts.shift_number
        FROM shifts
        WHERE orders.shift_id = shifts.id
        """
    )


def downgrade() -> None:
    op.drop_column("orders", "shift_number")
    op.drop_constraint("uq_shifts_store_shift_number", "shifts", type_="unique")
    op.drop_index("ix_shifts_shift_number", table_name="shifts")
    op.drop_column("shifts", "shift_number")
