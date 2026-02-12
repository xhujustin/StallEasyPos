from datetime import datetime, date
from typing import Optional
from sqlalchemy import BigInteger, Numeric, DateTime, Date, func, ForeignKey, UniqueConstraint, Index, Identity
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class DailyClosing(Base):
    __tablename__ = "daily_closings"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    store_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("stores.id", ondelete="RESTRICT"), nullable=False)
    business_date: Mapped[date] = mapped_column(Date, nullable=False)
    
    expected_cash: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, server_default="0")
    actual_cash: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, server_default="0")
    short_over: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, server_default="0")
    
    locked_by: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    locked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("store_id", "business_date", name="uq_daily_closings_store_date"),
        Index("idx_closings_store_date", "store_id", "business_date"),
    )
