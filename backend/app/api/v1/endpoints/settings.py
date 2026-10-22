from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
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
from app.services.upload_service import UploadService
from app.core.deps import get_current_user_id

router = APIRouter()


@router.post("/upload-logo", response_model=ResponseBase[str])
async def upload_store_logo(
    store_id: int,
    file: UploadFile = File(...),
    old_url: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    await StoreService.get_store_if_authorized(db, store_id, current_user_id)
    try:
        logo_url = await UploadService.save_store_logo(store_id, file, old_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ResponseBase(data=logo_url)

@router.get("/", response_model=ResponseBase[Dict[str, Any]])
async def get_settings(
    store_id: int,
    scope: SettingScope = Query(SettingScope.STORE),
    target_id: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    """
    取得特定範圍的所有設定
    """
    store = await StoreService.get_store_if_authorized(db, store_id, current_user_id)
    settings = await SettingService.get_settings_by_scope(
        db, store_id=store_id, scope=scope, target_id=target_id
    )
    
    # 若為店鋪級別，額外注入店鋪資訊
    if scope == SettingScope.STORE:
        settings["store_account"] = store.store_account or ""
        settings["store_name"] = store.name
                
    return {"data": settings}

@router.post("/batch", response_model=ResponseBase[bool])
async def update_settings_batch(
    store_id: int,
    data: SettingBatchUpdate,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    """
    批次更新設定
    """
    # 預先加載店鋪，減少循環查詢
    store = await StoreService.get_store_if_authorized(db, store_id, current_user_id)

    for key, value in data.settings.items():
        if data.scope == SettingScope.STORE:
            if key == "store_name":
                # 更新店鋪名稱
                normalized_name = str(value).strip()
                if not normalized_name:
                    raise HTTPException(status_code=422, detail="店鋪名稱不可空白")
                store.name = normalized_name
                continue
                
            elif key == "store_account":
                # 更新店鋪專屬帳號 (Store Account)
                normalized_account = str(value).strip() or None
                if store.store_account != normalized_account:
                    # 跨表唯一性檢查
                    # 1. 檢查店鋪帳號
                    if normalized_account:
                        store_check = await db.execute(
                            select(Store).where(
                                Store.store_account == normalized_account,
                                Store.id != store_id,
                            )
                        )
                        if store_check.scalar_one_or_none():
                            raise HTTPException(status_code=400, detail="此店鋪帳號已有人使用")
                    
                    # 2. 檢查使用者帳號
                        user_check = await db.execute(select(User).where(User.username == normalized_account))
                        if user_check.scalar_one_or_none():
                            raise HTTPException(status_code=400, detail="此帳號已與現有使用者衝突")
                    
                    store.store_account = normalized_account
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
