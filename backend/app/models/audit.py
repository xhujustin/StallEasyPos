from datetime import datetime
from enum import Enum
from typing import Any
from sqlalchemy import BigInteger, Text, DateTime, func, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB, ENUM as PG_ENUM
from app.models.base import Base

class AuditAction(str, Enum):
    ORDER_CREATED = "order_created"
    ORDER_VOIDED = "order_voided"
    PAYMENT_CREATED = "payment_created"
    PAYMENT_CONFIRMED = "payment_confirmed"
    CLOSING_LOCKED = "closing_locked"
    ADJUSTMENT_CREATED = "adjustment_created"
    INVOICE_REQUESTED = "invoice_requested"
    INVOICE_ISSUED = "invoice_issued"
    INVOICE_FAILED = "invoice_failed"
    INVOICE_RETRY = "invoice_retry"

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, server_default=func.generated_always_as_identity())
    store_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("stores.id", ondelete="RESTRICT"), nullable=False)
    actor_user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=False)
    
    action: Mapped[AuditAction] = mapped_column(PG_ENUM(AuditAction, name="audit_action", create_type=False), nullable=False)
    entity_type: Mapped[str] = mapped_column(Text, nullable=False)
    entity_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    
    snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_audit_store_created", "store_id", "created_at"),
        Index("idx_audit_entity", "entity_type", "entity_id"),
    )
