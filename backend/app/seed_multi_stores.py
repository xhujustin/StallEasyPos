import asyncio
import logging

from sqlalchemy import text
from app.core.database import SessionLocal
from app.models.store import Store
from app.models.user import StoreUser, UserRole

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_multi_store_data():
    """建立多店測試資料"""
    async with SessionLocal() as session:
        # 1. 檢查admin使用者是否存在
        result = await session.execute(text("SELECT id FROM users WHERE username = 'admin'"))
        admin_user_id = result.scalar()
        
        if not admin_user_id:
            logger.error("Admin user not found. Please run initial_data.py first.")
            return
        
        logger.info(f"Found admin user with id: {admin_user_id}")
        
        # 2. 檢查現有店鋪
        result = await session.execute(text("SELECT id, name FROM stores"))
        existing_stores = result.fetchall()
        logger.info(f"Existing stores: {existing_stores}")
        
        # 3. 建立測試店鋪
        test_stores = [
            {"name": "台北店", "owner_id": admin_user_id},
            {"name": "台中店", "owner_id": admin_user_id},
            {"name": "高雄店", "owner_id": admin_user_id},
        ]
        
        created_stores = []
        for store_data in test_stores:
            # 檢查店鋪是否已存在
            result = await session.execute(
                text("SELECT id FROM stores WHERE name = :name"),
                {"name": store_data["name"]}
            )
            existing_store_id = result.scalar()
            
            if existing_store_id:
                logger.info(f"Store '{store_data['name']}' already exists with id: {existing_store_id}")
                created_stores.append(existing_store_id)
            else:
                # 建立新店鋪
                store = Store(**store_data)
                session.add(store)
                await session.flush()
                logger.info(f"Created store: {store_data['name']} with id: {store.id}")
                created_stores.append(store.id)
        
        # 4. 建立 store_users 關聯
        for store_id in created_stores:
            # 檢查關聯是否已存在
            result = await session.execute(
                text("SELECT id FROM store_users WHERE store_id = :store_id AND user_id = :user_id"),
                {"store_id": store_id, "user_id": admin_user_id}
            )
            existing_relation = result.scalar()
            
            if existing_relation:
                logger.info(f"Store-User relation already exists for store_id={store_id}, user_id={admin_user_id}")
            else:
                # 建立關聯
                store_user = StoreUser(
                    store_id=store_id,
                    user_id=admin_user_id,
                    role=UserRole.OWNER
                )
                session.add(store_user)
                logger.info(f"Created store_user relation: store_id={store_id}, user_id={admin_user_id}, role=owner")
        
        await session.commit()
        logger.info("Multi-store test data seeding completed!")
        
        # 5. 驗證結果
        result = await session.execute(
            text("""
                SELECT s.id, s.name, su.role 
                FROM stores s
                JOIN store_users su ON s.id = su.store_id
                WHERE su.user_id = :user_id
            """),
            {"user_id": admin_user_id}
        )
        user_stores = result.fetchall()
        logger.info(f"\nAdmin user now has access to {len(user_stores)} stores:")
        for store in user_stores:
            logger.info(f"  - Store ID: {store[0]}, Name: {store[1]}, Role: {store[2]}")

if __name__ == "__main__":
    asyncio.run(seed_multi_store_data())
