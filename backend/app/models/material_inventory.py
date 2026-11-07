from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Identity, Index, Numeric, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class MaterialInventoryItem(Base):
    """A purchasable pack/SKU which is converted into a material's base unit."""

    __tablename__ = "material_inventory_items"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    material_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("materials.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    purchase_unit: Mapped[str] = mapped_column(Text, nullable=False)
    conversion_rate: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    supplier: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    material = relationship("Material", back_populates="inventory_items")

    __table_args__ = (
        UniqueConstraint("material_id", "name", name="uq_material_inventory_item_name"),
        Index("idx_material_inventory_items_material", "material_id"),
    )


class MaterialPurchase(Base):
    """Immutable purchase receipt used for price history and audit."""

    __tablename__ = "material_purchases"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    material_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("materials.id", ondelete="CASCADE"), nullable=False)
    inventory_item_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("material_inventory_items.id", ondelete="SET NULL"), nullable=True
    )
    purchase_quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    purchase_unit: Mapped[str] = mapped_column(Text, nullable=False)
    conversion_rate: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    base_quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    total_cost: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    resulting_average_cost: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    supplier: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    purchased_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_material_purchases_material_date", "material_id", "purchased_at"),
    )


class MaterialInventoryTransaction(Base):
    """Append-only stock ledger. Positive quantities enter stock; negative quantities leave it."""

    __tablename__ = "material_inventory_transactions"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    material_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("materials.id", ondelete="CASCADE"), nullable=False)
    transaction_type: Mapped[str] = mapped_column(Text, nullable=False)
    quantity_change: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    balance_before: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    balance_after: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    unit_cost_snapshot: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    total_cost: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    purchase_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("material_purchases.id", ondelete="SET NULL"), nullable=True
    )
    reference_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reference_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_material_inventory_transactions_material_date", "material_id", "created_at"),
    )
