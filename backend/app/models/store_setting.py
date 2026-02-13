from datetime import datetime
from typing import Optional
from decimal import Decimal
from sqlalchemy import BigInteger, Numeric, DateTime, func, ForeignKey, UniqueConstraint, Index, Identity
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class StoreSetting(Base):
    __tablename__ = "store_settings"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    store_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    fixed_cost_per_item: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, server_default="0")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("store_id", name="uq_store_settings_store"),
        Index("idx_store_settings_store", "store_id"),
    )
