from typing import List, Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.services.store_service import StoreService
from app.schemas.stores import StoreCreate, StoreOut, StoreUpdate
from app.schemas.common import ResponseBase

router = APIRouter()

@router.post("/", response_model=ResponseBase[StoreOut])
async def create_store(
    store_in: StoreCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """
    建立新店鋪
    """
    store = await StoreService.create_store(db, store_in, current_user_id)
    return ResponseBase(data=store)

@router.get("/", response_model=ResponseBase[List[StoreOut]])
async def list_my_stores(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """
    取得我可訪問的店鋪列表
    """
    stores = await StoreService.get_user_stores(db, current_user_id)
    return ResponseBase(data=stores)

@router.patch("/{store_id}", response_model=ResponseBase[StoreOut])
async def update_store(
    store_id: int,
    store_in: StoreUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """更新目前使用者可管理的店鋪基本資料。"""
    store = await StoreService.update_store(db, store_id, store_in, current_user_id)
    return ResponseBase(data=store)

@router.delete("/{store_id}", response_model=ResponseBase[bool])
async def delete_store(
    store_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """永久刪除店鋪；僅限店主或系統管理員。"""
    await StoreService.delete_store(db, store_id, current_user_id)
    return ResponseBase(message="店鋪已刪除", data=True)
