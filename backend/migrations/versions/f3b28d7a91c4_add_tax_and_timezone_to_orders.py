"""add tax and timezone snapshots to orders

Revision ID: f3b28d7a91c4
Revises: e14b9b0c62d8
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f3b28d7a91c4"
down_revision: Union[str, None] = "e14b9b0c62d8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("tax_rate", sa.Numeric(5, 2), nullable=False, server_default="5"))
    op.add_column("orders", sa.Column("tax_mode", sa.Text(), nullable=False, server_default="inclusive"))
    op.add_column("orders", sa.Column("tax_amount", sa.Numeric(10, 2), nullable=False, server_default="0"))
    op.add_column("orders", sa.Column("timezone", sa.Text(), nullable=False, server_default="Asia/Taipei"))


def downgrade() -> None:
    op.drop_column("orders", "timezone")
    op.drop_column("orders", "tax_amount")
    op.drop_column("orders", "tax_mode")
    op.drop_column("orders", "tax_rate")
