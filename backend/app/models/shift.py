from datetime import datetime
from enum import Enum
from typing import Optional
from sqlalchemy import BigInteger, DateTime, func, ForeignKey, Numeric, Integer, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from app.models.base import Base, psql_enum

class ShiftStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"

class Shift(Base):
    __tablename__ = "shifts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    store_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("stores.id"), nullable=False, index=True)
    shift_number: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    initial_cash: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    final_cash: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    
    # Cash Management
    cash_added: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    cash_removed: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    
    # Snapshots for reporting
    total_sales: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    cash_sales: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    total_net_profit: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    order_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    opened_by_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    closed_by_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True)
    
    status: Mapped[ShiftStatus] = mapped_column(psql_enum(ShiftStatus, name="shift_status"), nullable=False, default=ShiftStatus.OPEN, index=True)
    
    # Relationships
    opened_by: Mapped["User"] = relationship("User", foreign_keys=[opened_by_id])
    closed_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[closed_by_id])
    store: Mapped["Store"] = relationship("Store")
    transactions: Mapped[list["ShiftTransaction"]] = relationship("ShiftTransaction", back_populates="shift")

    __table_args__ = (
        UniqueConstraint("store_id", "shift_number", name="uq_shifts_store_shift_number"),
    )

class ShiftTransaction(Base):
    __tablename__ = "shift_transactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    shift_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("shifts.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    
    type: Mapped[str] = mapped_column(Text, nullable=False)  # 'in' or 'out'
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    shift: Mapped["Shift"] = relationship("Shift", back_populates="transactions")
    user: Mapped["User"] = relationship("User")
