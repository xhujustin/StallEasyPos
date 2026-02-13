from datetime import datetime
from typing import Optional, Any
from sqlalchemy import BigInteger, Text, Numeric, Boolean, DateTime, func, ForeignKey, Index, Identity
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.models.base import Base

class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    store_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    cost: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attributes: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    materials: Mapped[list["ProductMaterial"]] = relationship("ProductMaterial", back_populates="product", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_products_store_category", "store_id", "category"),
    )
