from datetime import datetime
from typing import Optional
from decimal import Decimal
from sqlalchemy import BigInteger, Boolean, Text, Numeric, DateTime, Integer, func, ForeignKey, Index, Identity
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class Material(Base):
    __tablename__ = "materials"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    store_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    unit: Mapped[str] = mapped_column(Text, nullable=False)  # g, ml, 個, 包
    stock_quantity: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False, server_default="0")
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False, server_default="0")
    low_stock_threshold: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 4), nullable=True, server_default="0")
    material_type: Mapped[str] = mapped_column(Text, nullable=False, server_default="raw")
    output_quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, server_default="1")
    group_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    inventory_items = relationship("MaterialInventoryItem", back_populates="material", cascade="all, delete-orphan")
    components = relationship(
        "MaterialComposition",
        foreign_keys="MaterialComposition.composite_material_id",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        Index(
            "uq_materials_active_store_name",
            "store_id",
            "name",
            unique=True,
            postgresql_where=is_active.is_(True),
        ),
        Index("idx_materials_store", "store_id"),
        Index("idx_materials_store_type_group", "store_id", "material_type", "group_name"),
        Index("idx_materials_store_display_order", "store_id", "display_order"),
    )
