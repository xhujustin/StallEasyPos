from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

# 建立非同步資料庫引擎
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,          # 生產環境建議關閉 echo
    future=True,
    pool_pre_ping=True,  # 自動偵測斷線重連
    pool_size=10,        # 連線池大小
    max_overflow=20      # 最大溢出連線數
)

# 建立 Session 工廠
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

async def get_db() -> AsyncSession:
    """
    依賴注入用的資料庫 Session 生成器
    """
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
