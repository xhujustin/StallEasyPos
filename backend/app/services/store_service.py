from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.store import Store
from app.models.user import StoreUser, UserRole, User
from app.schemas.stores import StoreCreate

class StoreService:
    """
    店鋪服務: 建立店鋪、查詢列表、權限檢查
    """
    
    @staticmethod
    async def create_store(db: AsyncSession, store_in: StoreCreate, owner_id: int) -> Store:
        """
        建立新店鋪
        - 建立 Store
        - 自動將 Owner 加入 store_users (Role=OWNER)
        """
        # 1. Create Store
        store = Store(
            name=store_in.name,
            owner_id=owner_id
        )
        db.add(store)
        await db.flush() # flush to get store.id

        # 2. Add Owner to StoreUser
        store_user = StoreUser(
            store_id=store.id,
            user_id=owner_id,
            role=UserRole.OWNER
        )
        db.add(store_user)
        
        await db.commit()
        await db.refresh(store)
        return store

    @staticmethod
    async def get_user_stores(db: AsyncSession, user_id: int) -> List[dict]:
        """取得使用者可訪問的所有店鋪(含角色資訊)"""
        user = await db.get(User, user_id)
        
        if user and user.is_admin:
            # 全域管理員可以看到所有店鋪，角色暫定為 OWNER
            query = select(Store)
            result = await db.execute(query)
            stores_with_roles = []
            for store in result.scalars().all():
                stores_with_roles.append({
                    'id': store.id,
                    'name': store.name,
                    'owner_id': store.owner_id,
                    'user_role': UserRole.OWNER.value, # ADMIN behaves like OWNER
                    'created_at': store.created_at
                })
            return stores_with_roles

        # 一般使用者查詢
        query = (
            select(Store, StoreUser.role)
            .join(StoreUser, Store.id == StoreUser.store_id)
            .where(StoreUser.user_id == user_id)
        )
        result = await db.execute(query)
        
        stores_with_roles = []
        for store, role in result:
            store_dict = {
                'id': store.id,
                'name': store.name,
                'owner_id': store.owner_id,
                'user_role': role.value,
                'created_at': store.created_at
            }
            stores_with_roles.append(store_dict)
        
        return stores_with_roles

    @staticmethod
    async def get_store_if_authorized(db: AsyncSession, store_id: int, user_id: int) -> Store:
        """取得特定店鋪 (需驗證權限，ADMIN 除外)"""
        # 1. 檢查是否為全域管理員
        user = await db.get(User, user_id)
        if user and user.is_admin:
            store = await db.get(Store, store_id)
            if not store:
                raise HTTPException(status_code=404, detail="Store not found")
            return store

        # 2. 一般使用者權限檢查
        query = (
            select(Store)
            .join(StoreUser, Store.id == StoreUser.store_id)
            .where(Store.id == store_id, StoreUser.user_id == user_id)
        )
        result = await db.execute(query)
        store = result.scalars().first()
        if not store:
            raise HTTPException(status_code=403, detail="Store not found or permission denied")
        return store

    @staticmethod
    async def update_store(db: AsyncSession, store_id: int, store_in: StoreCreate) -> Optional[Store]:
        """更新店鋪基本資訊"""
        store = await db.get(Store, store_id)
        if not store:
            return None
        
        if store_in.name is not None:
            store.name = store_in.name
            
        await db.commit()
        await db.refresh(store)
        return store
