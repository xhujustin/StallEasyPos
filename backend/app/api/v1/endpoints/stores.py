from typing import List, Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.services.store_service import StoreService
from app.schemas.stores import StoreCreate, StoreOut
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
