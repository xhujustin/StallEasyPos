from datetime import datetime
from typing import Optional
from decimal import Decimal
from sqlalchemy import BigInteger, Text, Numeric, DateTime, func, ForeignKey, UniqueConstraint, Index, Identity
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class Material(Base):
    __tablename__ = "materials"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    store_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    unit: Mapped[str] = mapped_column(Text, nullable=False)  # g, ml, 個, 包
    stock_quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, server_default="0")
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, server_default="0")
    low_stock_threshold: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True, server_default="0")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("store_id", "name", name="uq_materials_store_name"),
        Index("idx_materials_store", "store_id"),
    )
