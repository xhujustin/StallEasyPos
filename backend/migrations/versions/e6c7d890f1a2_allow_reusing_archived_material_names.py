"""allow reusing archived material names

Revision ID: e6c7d890f1a2
Revises: d5b6c789e0f1
"""
from alembic import op

revision = "e6c7d890f1a2"
down_revision = "d5b6c789e0f1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("uq_materials_store_name", "materials", type_="unique")
    op.create_index(
        "uq_materials_active_store_name",
        "materials",
        ["store_id", "name"],
        unique=True,
        postgresql_where="is_active IS TRUE",
    )


def downgrade() -> None:
    op.drop_index("uq_materials_active_store_name", table_name="materials")
    op.create_unique_constraint("uq_materials_store_name", "materials", ["store_id", "name"])
