from typing import Any
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData

# 定義 Naming Convention 以確保 Constraint 名稱一致 (對 Migration 很重要)
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

class Base(DeclarativeBase):
    """
    SQLAlchemy Base 類別
    """
    metadata = MetaData(naming_convention=NAMING_CONVENTION)

    @declared_attr
    def __tablename__(cls) -> str:
        """
        自動將 table name 轉換為 snake_case
        例如: User -> user, OrderItem -> order_item
        """
        return cls.__name__.lower()

def psql_enum(enum_cls, name=None):
    from sqlalchemy.dialects.postgresql import ENUM
    return ENUM(enum_cls, name=name, values_callable=lambda x: [e.value for e in x])
