from typing import Annotated, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id, SessionDep
from app.models.user import User
from app.services.user_service import UserService
from app.services.store_service import StoreService
from app.schemas.users import UserOut, StoreUserCreate, StoreUserUpdate, StoreUserOut
from app.schemas.common import ResponseBase
from app.schemas.stores import StoreOut

router = APIRouter()

@router.get("/me", response_model=ResponseBase[UserOut])
async def read_users_me(
    db: SessionDep,
    current_user_id: Annotated[int, Depends(get_current_user_id)],
) -> Any:
    """取得當前登入使用者資訊"""
    user = await db.get(User, current_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 注入店鋪資訊
    stores = await StoreService.get_user_stores(db, current_user_id)
    user_out = UserOut.model_validate(user)
    user_out.stores = stores
    
    return ResponseBase(data=user_out)

@router.get("/", response_model=ResponseBase[List[StoreUserOut]])
async def list_store_users(
    db: SessionDep,
    current_user_id: Annotated[int, Depends(get_current_user_id)],
    store_id: int
):
    """取得店鋪人員列表 (需店鋪權限)"""
    await StoreService.get_store_if_authorized(db, store_id, current_user_id)
    users = await UserService.get_store_users(db, store_id)
    return ResponseBase(data=users)

@router.post("/", response_model=ResponseBase[UserOut])
async def add_store_user(
    db: SessionDep,
    current_user_id: Annotated[int, Depends(get_current_user_id)],
    store_id: int,
    user_in: StoreUserCreate
):
    """新增店鋪人員 (需店鋪權限)"""
    # 這裡可以再細分，只有 OWNER 可以新增人員
    await StoreService.get_store_if_authorized(db, store_id, current_user_id)
    user = await UserService.create_store_user(db, store_id, user_in)
    return ResponseBase(data=user)

@router.put("/{user_id}", response_model=ResponseBase[UserOut])
async def update_store_user(
    db: SessionDep,
    current_user_id: Annotated[int, Depends(get_current_user_id)],
    store_id: int,
    user_id: int,
    user_in: StoreUserUpdate
):
    """更新店鋪人員角色或 PIN 碼"""
    await StoreService.get_store_if_authorized(db, store_id, current_user_id)
    user = await UserService.update_store_user(db, store_id, user_id, user_in)
    if not user:
        raise HTTPException(status_code=404, detail="User not found in this store")
    return ResponseBase(data=user)

@router.delete("/{user_id}", response_model=ResponseBase[bool])
async def remove_store_user(
    db: SessionDep,
    current_user_id: Annotated[int, Depends(get_current_user_id)],
    store_id: int,
    user_id: int
):
    """將人員從店鋪移除"""
    await StoreService.get_store_if_authorized(db, store_id, current_user_id)
    success = await UserService.remove_from_store(db, store_id, user_id)
    return ResponseBase(data=success)
