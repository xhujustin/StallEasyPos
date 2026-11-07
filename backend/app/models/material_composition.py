from decimal import Decimal

from sqlalchemy import BigInteger, ForeignKey, Identity, Index, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class MaterialComposition(Base):
    __tablename__ = "material_compositions"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    composite_material_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("materials.id", ondelete="CASCADE"), nullable=False
    )
    component_material_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("materials.id", ondelete="RESTRICT"), nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)

    component = relationship("Material", foreign_keys=[component_material_id], lazy="joined")

    __table_args__ = (
        UniqueConstraint("composite_material_id", "component_material_id", name="uq_material_composition_component"),
        Index("idx_material_compositions_composite", "composite_material_id"),
    )
