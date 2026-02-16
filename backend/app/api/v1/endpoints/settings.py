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
    
    # 若為店鋪級別，額外注入店鋪資訊
    if scope == SettingScope.STORE:
        store_result = await db.execute(select(Store).where(Store.id == store_id))
        store = store_result.scalar_one_or_none()
        if store:
            settings["store_account"] = store.store_account or ""
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
    # 預先加載店鋪，減少循環查詢
    store_result = await db.execute(select(Store).where(Store.id == store_id))
    store = store_result.scalar_one_or_none()
    
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    for key, value in data.settings.items():
        if data.scope == SettingScope.STORE:
            if key == "store_name":
                # 更新店鋪名稱
                store.name = value
                continue
                
            elif key == "store_account":
                # 更新店鋪專屬帳號 (Store Account)
                if store.store_account != value:
                    # 跨表唯一性檢查
                    # 1. 檢查店鋪帳號
                    store_check = await db.execute(select(Store).where(Store.store_account == value))
                    if store_check.scalar_one_or_none():
                        raise HTTPException(status_code=400, detail="此店鋪帳號已有人使用")
                    
                    # 2. 檢查使用者帳號
                    user_check = await db.execute(select(User).where(User.username == value))
                    if user_check.scalar_one_or_none():
                        raise HTTPException(status_code=400, detail="此帳號已與現有使用者衝突")
                    
                    store.store_account = value
                continue

        # 其他通用設定，導向 SettingService
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
