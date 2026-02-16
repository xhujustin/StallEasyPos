from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db
from app.services.setting_service import SettingService
from app.services.store_service import StoreService
from app.schemas.settings import SettingBatchUpdate
from app.schemas.common import ResponseBase
from app.models.system_setting import SettingScope
from app.models.store import Store
from app.models.user import User, StoreUser, UserRole
from app.services.user_service import UserService
from app.core import security
from sqlalchemy import select, and_

router = APIRouter()

@router.get("/", response_model=ResponseBase[Dict[str, Any]])
async def get_settings(
    store_id: int,
    scope: SettingScope = Query(SettingScope.STORE),
    target_id: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    取得特定範圍的所有設定
    """
    settings = await SettingService.get_settings_by_scope(
        db, store_id=store_id, scope=scope, target_id=target_id
    )
    
    # 若為店鋪級別，額外注入店鋪帳號 (username)
    if scope == SettingScope.STORE:
        store_result = await db.execute(select(Store).where(Store.id == store_id))
        store = store_result.scalar_one_or_none()
        if store:
            user_result = await db.execute(select(User).where(User.id == store.owner_id))
            owner = user_result.scalar_one_or_none()
            if owner:
                settings["store_account"] = owner.username
                settings["store_name"] = store.name
                
    return {"data": settings}

@router.post("/batch", response_model=ResponseBase[bool])
async def update_settings_batch(
    store_id: int,
    data: SettingBatchUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    批次更新設定
    """
    for key, value in data.settings.items():
        if key == "store_name" and data.scope == SettingScope.STORE:
            # 更新店鋪名稱
            from app.schemas.stores import StoreCreate
            await StoreService.update_store(db, store_id, StoreCreate(name=value))
            
        elif key == "store_account" and data.scope == SettingScope.STORE:
            # 同步更新店鋪擁有者的 username (登入帳號)
            store_result = await db.execute(select(Store).where(Store.id == store_id))
            store = store_result.scalar_one_or_none()
            if store:
                user_result = await db.execute(select(User).where(User.id == store.owner_id))
                owner = user_result.scalar_one_or_none()
            if owner:
                if owner.is_admin:
                    # 若當前擁有者是 Admin，不改名，而是轉移所有權給新帳號 (或建立新帳號)
                    if owner.username != value:
                        # 1. 檢查目標帳號是否存在
                        target_user_result = await db.execute(select(User).where(User.username == value))
                        target_user = target_user_result.scalar_one_or_none()

                        if not target_user:
                            # 2. 不存在則建立新使用者 (Owner)
                            hashed_pw = security.get_password_hash("000000") # 預設 PIN 當密碼
                            target_user = User(
                                username=value,
                                hashed_password=hashed_pw,
                                is_admin=False,
                                full_name=f"{value} Owner"
                            )
                            db.add(target_user)
                            await db.flush() # 取得 ID
                            
                            # 設定 PIN
                            pin_hash = security.get_password_hash("000000")
                            store_user = StoreUser(
                                store_id=store_id,
                                user_id=target_user.id,
                                role=UserRole.OWNER,
                                pin_hash=pin_hash
                            )
                            db.add(store_user)
                        else:
                            # 3. 存在則確保其在該店鋪的角色
                            assoc_result = await db.execute(
                                select(StoreUser).where(
                                    and_(StoreUser.store_id == store_id, StoreUser.user_id == target_user.id)
                                )
                            )
                            store_user = assoc_result.scalar_one_or_none()
                            if not store_user:
                                store_user = StoreUser(
                                    store_id=store_id,
                                    user_id=target_user.id,
                                    role=UserRole.OWNER
                                )
                                db.add(store_user)
                            else:
                                store_user.role = UserRole.OWNER # 升級為 Owner

                        # 4. 轉移店鋪所有權
                        store.owner_id = target_user.id
                        
                else:
                    # 若擁有者是一般使用者，則直接改名 (Rename)
                    if owner.username != value:
                        exists_result = await db.execute(select(User).where(User.username == value))
                        if exists_result.scalar_one_or_none():
                            raise HTTPException(status_code=400, detail="此帳號已被使用")
                        owner.username = value
        else:
            await SettingService.update_setting(
                db, 
                store_id=store_id, 
                key=key, 
                value=value, 
                scope=data.scope, 
                target_id=data.target_id
            )
    await db.commit()
    return {"data": True}
