from datetime import datetime
from enum import Enum
from typing import Optional, List
from sqlalchemy import BigInteger, Text, DateTime, func, ForeignKey, UniqueConstraint, Identity
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from app.models.base import Base, psql_enum

class UserRole(str, Enum):
    OWNER = "owner"
    MANAGER = "manager"
    STAFF = "staff"

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    username: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    hashed_password: Mapped[str] = mapped_column(Text, nullable=False)
    is_admin: Mapped[bool] = mapped_column(server_default="false", nullable=False)
    
    # 詳細資訊
    full_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    nickname: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(Text, nullable=True) # e.g. "male", "female", "other"
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    birthday: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
   # store_associations: Mapped[List["StoreUser"]] = relationship(back_populates="user")

class StoreUser(Base):
    __tablename__ = "store_users"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    store_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    role: Mapped[UserRole] = mapped_column(psql_enum(UserRole, name="user_role"), nullable=False)
    pin_hash: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("store_id", "user_id", name="uq_store_users_store_user"),
    )

    # Relationships (resolved by string to avoid circular imports if needed, or import at top)
    # user: Mapped["User"] = relationship(back_populates="store_associations")
    # store: Mapped["Store"] = relationship(back_populates="users")
