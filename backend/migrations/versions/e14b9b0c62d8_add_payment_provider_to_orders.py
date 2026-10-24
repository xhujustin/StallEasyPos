"""add payment provider to orders

Revision ID: e14b9b0c62d8
Revises: c7f61aa9d304
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e14b9b0c62d8"
down_revision: Union[str, None] = "c7f61aa9d304"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("payment_provider", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "payment_provider")
