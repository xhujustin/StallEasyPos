from datetime import datetime
from typing import Optional, List
from sqlalchemy import BigInteger, Text, DateTime, func, Identity
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class Store(Base):
    __tablename__ = "stores"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    store_account: Mapped[Optional[str]] = mapped_column(Text, unique=True, nullable=True)
    owner_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    # users: Mapped[List["StoreUser"]] = relationship(back_populates="store")
