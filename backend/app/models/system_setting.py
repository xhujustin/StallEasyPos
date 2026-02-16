from datetime import datetime
from enum import Enum
from typing import Optional, Any
from sqlalchemy import BigInteger, Text, DateTime, func, ForeignKey, UniqueConstraint, Index, Identity
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB
from app.models.base import Base, psql_enum

class SettingScope(str, Enum):
    STORE = "store"
    DEVICE = "device"
    USER = "user"

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    store_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("stores.id", ondelete="CASCADE"), nullable=False)
    
    scope: Mapped[SettingScope] = mapped_column(
        psql_enum(SettingScope, name="setting_scope"), 
        nullable=False, 
        server_default="store"
    )
    
    # target_id 用於儲存具體的物件 ID (如 user_id 或 device_uuid)
    # 若 scope 為 store，則通常與 store_id 相同或可留空
    target_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    key: Mapped[str] = mapped_column(Text, nullable=False)
    value: Mapped[Any] = mapped_column(JSONB, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("store_id", "scope", "target_id", "key", name="uq_system_settings_key"),
        Index("idx_system_settings_store_scope", "store_id", "scope"),
        Index("idx_system_settings_key", "key"),
    )
