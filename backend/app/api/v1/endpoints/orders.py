from typing import List, Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.services.order_service import OrderService
from app.schemas.orders import OrderCreate, OrderOut
from app.schemas.common import ResponseBase

router = APIRouter()

@router.post("/", response_model=ResponseBase[OrderOut])
async def create_order(
    store_id: Annotated[int, Query()],
    order_in: OrderCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """
    建立訂單 (支援 Idempotency)
    """
    order = await OrderService.create_order(db, store_id, order_in, current_user_id)
    return ResponseBase(data=order)

@router.get("/", response_model=ResponseBase[List[OrderOut]])
async def list_orders(
    store_id: Annotated[int, Query()],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """
    取得店鋪訂單
    """
    orders = await OrderService.get_store_orders(db, store_id, current_user_id)
    return ResponseBase(data=orders)
