from datetime import datetime
from enum import Enum
from typing import Optional
from sqlalchemy import BigInteger, Text, DateTime, func, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from app.models.base import Base

class InvoiceStatus(str, Enum):
    NONE = "none"
    PENDING = "pending"
    ISSUED = "issued"
    FAILED = "failed"
    VOIDED = "voided"

class InvoiceRecord(Base):
    __tablename__ = "invoice_records"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, server_default=func.generated_always_as_identity())
    store_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("stores.id", ondelete="RESTRICT"), nullable=False)
    order_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    
    status: Mapped[InvoiceStatus] = mapped_column(PG_ENUM(InvoiceStatus, name="invoice_status", create_type=False), nullable=False, server_default="pending")
    invoice_number: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    carrier: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tax_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    provider: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_attempt_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    next_retry_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_since: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("order_id", name="uq_invoice_order"),
        Index("idx_invoices_store_status", "store_id", "status"),
        Index("idx_invoices_failed_since", "failed_since"),
    )
