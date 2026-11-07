"""add material groups

Revision ID: 9d1a2c34e5f6
Revises: 8c0f1b23d4e5
"""
from alembic import op
import sqlalchemy as sa

revision = "9d1a2c34e5f6"
down_revision = "8c0f1b23d4e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("materials", sa.Column("group_name", sa.Text(), nullable=True))
    op.create_index("idx_materials_store_type_group", "materials", ["store_id", "material_type", "group_name"])


def downgrade() -> None:
    op.drop_index("idx_materials_store_type_group", table_name="materials")
    op.drop_column("materials", "group_name")
