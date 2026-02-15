from datetime import datetime, date
from enum import Enum
from typing import Optional, List
from sqlalchemy import BigInteger, Text, Numeric, Boolean, DateTime, Date, func, ForeignKey, UniqueConstraint, Index, Identity
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM, JSONB
from app.models.base import Base, psql_enum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.user import User

class OrderSource(str, Enum):
    POS = "pos"
    DELIVERY = "delivery"

class OrderStatus(str, Enum):
    DRAFT = "draft"
    PENDING_PAYMENT = "pending_payment"
    PAID = "paid"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NEEDS_REVIEW = "needs_review"

class PaymentMethod(str, Enum):
    CASH = "cash"
    LINEPAY = "linepay"
    PLATFORM_COLLECT = "platform_collect"

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    store_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("stores.id", ondelete="RESTRICT"), nullable=False)
    shift_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("shifts.id", ondelete="SET NULL"), nullable=True, index=True)
    order_no: Mapped[int] = mapped_column(BigInteger, nullable=False)
    
    source: Mapped[OrderSource] = mapped_column(psql_enum(OrderSource, name="order_source"), nullable=False, server_default="pos")
    status: Mapped[OrderStatus] = mapped_column(psql_enum(OrderStatus, name="order_status"), nullable=False)
    
    total_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[Optional[PaymentMethod]] = mapped_column(psql_enum(PaymentMethod, name="payment_method"), nullable=True)
    
    idempotency_key: Mapped[str] = mapped_column(Text, nullable=False)
    business_date: Mapped[date] = mapped_column(Date, nullable=False, server_default=func.current_date())
    
    is_voided: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    voided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    voided_by: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True)
    void_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_by_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("users.id"), nullable=True)
    cash_received: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    change_amount: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    created_by: Mapped[Optional["User"]] = relationship(foreign_keys=[created_by_id])

    __table_args__ = (
        UniqueConstraint("store_id", "business_date", "order_no", name="uq_orders_store_date_orderno"),
        UniqueConstraint("store_id", "idempotency_key", name="uq_orders_store_idempotency"),
        Index("idx_orders_store_created", "store_id", "created_at"),
        Index("idx_orders_store_date", "store_id", "business_date"),
        Index("idx_orders_store_status", "store_id", "status"),
    )

    # Relationships
    items: Mapped[List["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    order_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    
    name_snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    price_snapshot: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    cost_snapshot: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    
    quantity: Mapped[float] = mapped_column(Numeric(10, 3), nullable=False, server_default="1")
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    packaging_used: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    options: Mapped[Optional[List[dict]]] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    order: Mapped["Order"] = relationship(back_populates="items")
