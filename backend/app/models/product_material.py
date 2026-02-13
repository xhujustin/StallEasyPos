from datetime import datetime
from decimal import Decimal
from sqlalchemy import BigInteger, Numeric, DateTime, func, ForeignKey, UniqueConstraint, Index, Identity
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class ProductMaterial(Base):
    __tablename__ = "product_materials"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    material_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("materials.id", ondelete="RESTRICT"), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)  # 消耗數量,支援小數
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    product = relationship("Product", back_populates="materials")
    material = relationship("Material")

    __table_args__ = (
        UniqueConstraint("product_id", "material_id", name="uq_product_materials"),
        Index("idx_product_materials_product", "product_id"),
    )
