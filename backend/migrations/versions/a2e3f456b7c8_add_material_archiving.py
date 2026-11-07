"""add material archiving

Revision ID: a2e3f456b7c8
Revises: 9d1a2c34e5f6
"""
from alembic import op
import sqlalchemy as sa

revision = "a2e3f456b7c8"
down_revision = "9d1a2c34e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("materials", sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False))


def downgrade() -> None:
    op.drop_column("materials", "is_active")
