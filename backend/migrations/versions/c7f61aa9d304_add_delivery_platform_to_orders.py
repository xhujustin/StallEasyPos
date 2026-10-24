"""add delivery platform to orders

Revision ID: c7f61aa9d304
Revises: b17ccaeb7fb4
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c7f61aa9d304"
down_revision: Union[str, None] = "b17ccaeb7fb4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("delivery_platform", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "delivery_platform")
