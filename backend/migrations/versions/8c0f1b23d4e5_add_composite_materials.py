"""add composite materials

Revision ID: 8c0f1b23d4e5
Revises: 7b9e0a12c3d4
"""
from alembic import op
import sqlalchemy as sa

revision = "8c0f1b23d4e5"
down_revision = "7b9e0a12c3d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("materials", sa.Column("material_type", sa.Text(), server_default="raw", nullable=False))
    op.add_column("materials", sa.Column("output_quantity", sa.Numeric(14, 4), server_default="1", nullable=False))
    op.create_table(
        "material_compositions",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("composite_material_id", sa.BigInteger(), nullable=False),
        sa.Column("component_material_id", sa.BigInteger(), nullable=False),
        sa.Column("quantity", sa.Numeric(14, 4), nullable=False),
        sa.ForeignKeyConstraint(["composite_material_id"], ["materials.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["component_material_id"], ["materials.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("composite_material_id", "component_material_id", name="uq_material_composition_component"),
    )
    op.create_index("idx_material_compositions_composite", "material_compositions", ["composite_material_id"])


def downgrade() -> None:
    op.drop_table("material_compositions")
    op.drop_column("materials", "output_quantity")
    op.drop_column("materials", "material_type")
