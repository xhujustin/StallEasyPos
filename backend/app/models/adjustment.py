from datetime import datetime, date
from enum import Enum
from typing import Optional
from sqlalchemy import BigInteger, Text, Numeric, DateTime, Date, func, ForeignKey, Index, Identity
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from app.models.base import Base, psql_enum

class AdjustmentType(str, Enum):
    INCREASE = "increase"
    DECREASE = "decrease"

class Adjustment(Base):
    __tablename__ = "adjustments"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    store_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("stores.id", ondelete="RESTRICT"), nullable=False)
    business_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    adjustment_type: Mapped[AdjustmentType] = mapped_column(psql_enum(AdjustmentType, name="adjustment_type"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False) # Check amount > 0 handled in logic or raw SQL
    
    reason_code: Mapped[str] = mapped_column(Text, nullable=False)
    reason_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    related_order_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("orders.id"), nullable=True)
    created_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    
    ai_flag: Mapped[str] = mapped_column(Text, nullable=False, server_default="none")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_adjustments_store_date", "store_id", "business_date"),
    )
