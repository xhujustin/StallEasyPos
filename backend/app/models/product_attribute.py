from datetime import datetime
from typing import Optional
from decimal import Decimal
from sqlalchemy import BigInteger, Text, Integer, Boolean, Numeric, DateTime, func, ForeignKey, UniqueConstraint, Index, Identity
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class ProductAttribute(Base):
    __tablename__ = "product_attributes"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)  # 尺寸、甜度、溫度
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_product_attributes_product", "product_id"),
    )


class ProductAttributeOption(Base):
    __tablename__ = "product_attribute_options"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    attribute_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("product_attributes.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)  # 大杯、中杯、小杯
    price_adjustment: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_attribute_options_attribute", "attribute_id"),
    )


class OptionMaterial(Base):
    __tablename__ = "option_materials"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    option_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("product_attribute_options.id", ondelete="CASCADE"), nullable=False)
    material_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("materials.id", ondelete="CASCADE"), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("option_id", "material_id", name="uq_option_materials"),
        Index("idx_option_materials_option", "option_id"),
        Index("idx_option_materials_material", "material_id"),
    )
