import asyncio
import sys
import os

# 將父目錄加入路徑以便導入 app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.models.user import User, StoreUser, UserRole
from app.core import security

async def init_credentials():
    engine = create_async_engine(str(settings.DATABASE_URL).replace("postgresql://", "postgresql+asyncpg://"))
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as db:
        # 1. 初始化 Admin
        admin_username = "admin"
        admin_pin = "000000"
        
        result = await db.execute(select(User).where(User.username == admin_username))
        admin = result.scalars().first()
        
        if not admin:
            print(f"Creating admin user: {admin_username}")
            admin = User(
                username=admin_username,
                hashed_password=security.get_password_hash(admin_pin),
                is_admin=True
            )
            db.add(admin)
            await db.flush()
        else:
            print(f"Updating admin user: {admin_username}")
            admin.hashed_password = security.get_password_hash(admin_pin)
            admin.is_admin = True
        
        # 2. 初始化 Owner
        owner_username = "owner"
        owner_pin = "111111"
        
        result = await db.execute(select(User).where(User.username == owner_username))
        owner = result.scalars().first()
        
        if not owner:
            print(f"Creating owner user: {owner_username}")
            owner = User(
                username=owner_username,
                hashed_password=security.get_password_hash(owner_pin),
                is_admin=False
            )
            db.add(owner)
            await db.flush()
        else:
            print(f"Updating owner user: {owner_username}")
            owner.hashed_password = security.get_password_hash(owner_pin)

        # 處理 PIN (在 StoreUser 中)
        # 尋找 Admin 與 Owner 是否有任何 StoreUser 關聯，若沒有則略過 PIN 設定 (或連結至 ID=1 的店鋪)
        # 這裡我們至少為 Admin 設定全域 PIN (如果有對應店鋪的話)
        from app.models.store import Store
        store_result = await db.execute(select(Store).order_by(Store.id))
        first_store = store_result.scalars().first()
        
        if first_store:
            # 設定 Admin PIN
            assoc_result = await db.execute(select(StoreUser).where(StoreUser.user_id == admin.id, StoreUser.store_id == first_store.id))
            admin_assoc = assoc_result.scalars().first()
            if not admin_assoc:
                admin_assoc = StoreUser(user_id=admin.id, store_id=first_store.id, role=UserRole.OWNER)
                db.add(admin_assoc)
            admin_assoc.pin_hash = security.get_password_hash(admin_pin)
            
            # 設定 Owner PIN
            assoc_result = await db.execute(select(StoreUser).where(StoreUser.user_id == owner.id, StoreUser.store_id == first_store.id))
            owner_assoc = assoc_result.scalars().first()
            if not owner_assoc:
                owner_assoc = StoreUser(user_id=owner.id, store_id=first_store.id, role=UserRole.OWNER)
                db.add(owner_assoc)
            owner_assoc.pin_hash = security.get_password_hash(owner_pin)
            
            print(f"Set PINs for {admin_username} and {owner_username} in store: {first_store.name}")

        await db.commit()
        print("Successfully initialized credentials.")

if __name__ == "__main__":
    asyncio.run(init_credentials())
