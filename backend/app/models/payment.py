from datetime import datetime
from enum import Enum
from typing import Optional
from sqlalchemy import BigInteger, Text, Numeric, DateTime, func, ForeignKey, UniqueConstraint, Index, Identity
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB, ENUM as PG_ENUM
from app.models.base import Base, psql_enum
from app.models.order import PaymentMethod

class PaymentStatus(str, Enum):
    CREATED = "created"
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    MANUAL_CONFIRMED = "manual_confirmed"
    VOIDED = "voided"

class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    order_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    store_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("stores.id", ondelete="RESTRICT"), nullable=False)
    
    method: Mapped[PaymentMethod] = mapped_column(psql_enum(PaymentMethod, name="payment_method"), nullable=False)
    provider: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provider_txn_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    status: Mapped[PaymentStatus] = mapped_column(psql_enum(PaymentStatus, name="payment_status"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    
    idempotency_key: Mapped[str] = mapped_column(Text, nullable=False)
    raw_payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("store_id", "idempotency_key", name="uq_payments_store_idempotency"),
        UniqueConstraint("provider", "provider_txn_id", name="uq_payments_provider_txn"),
        Index("idx_payments_store_created", "store_id", "created_at"),
        Index("idx_payments_status", "status"),
    )
