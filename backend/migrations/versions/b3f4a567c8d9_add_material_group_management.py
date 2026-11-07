"""add material group management

Revision ID: b3f4a567c8d9
Revises: a2e3f456b7c8
"""
from alembic import op
import sqlalchemy as sa

revision = "b3f4a567c8d9"
down_revision = "a2e3f456b7c8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "material_groups",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("store_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("display_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("store_id", "name", name="uq_material_groups_store_name"),
    )
    op.create_index("idx_material_groups_store_order", "material_groups", ["store_id", "display_order"])
    op.execute("""
        INSERT INTO material_groups (store_id, name, display_order)
        SELECT store_id, group_name, ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY group_name)
        FROM materials
        WHERE group_name IS NOT NULL AND BTRIM(group_name) <> ''
        GROUP BY store_id, group_name
    """)


def downgrade() -> None:
    op.drop_table("material_groups")
