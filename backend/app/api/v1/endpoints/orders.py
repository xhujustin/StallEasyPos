from datetime import date
from typing import List, Annotated
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.services.order_service import OrderService
from app.schemas.orders import OrderCreate, OrderOut
from app.schemas.common import ResponseBase

router = APIRouter()

@router.get("/next-number", response_model=ResponseBase[int])
async def get_next_order_number(
    store_id: Annotated[int, Query()],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """取得今日下一個可用的 POS 單號。"""
    order_no = await OrderService.get_next_order_no(db, store_id, current_user_id)
    return ResponseBase(data=order_no)

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
    current_user_id: Annotated[int, Depends(get_current_user_id)],
    status: Annotated[str | None, Query()] = None,
    start_date: Annotated[str | None, Query()] = None,
    end_date: Annotated[str | None, Query()] = None,
    search: Annotated[str | None, Query()] = None,
    shift_id: Annotated[int | None, Query()] = None,
):
    """
    取得店鋪訂單 (支援篩選)
    """
    # Parse dates if provided
    parsed_start = date.fromisoformat(start_date) if start_date else None
    parsed_end = date.fromisoformat(end_date) if end_date else None
    
    orders = await OrderService.get_store_orders(
        db, store_id, current_user_id, 
        status=status, 
        start_date=parsed_start, 
        end_date=parsed_end, 
        search=search,
        shift_id=shift_id
    )
    return ResponseBase(data=orders)

@router.put("/{order_id}/status", response_model=ResponseBase[OrderOut])
async def update_order_status(
    store_id: Annotated[int, Query()],
    order_id: int,
    status: Annotated[str, Query()], # Enum string
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """
    更新訂單狀態
    """
    # Simply pass string, service assumes Enum or valid value (controller could validate)
    # For robust validation, we can use OrderStatus enum in annotation
    from app.models.order import OrderStatus
    try:
        new_status = OrderStatus(status)
    except ValueError:
         raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    order = await OrderService.update_order_status(db, order_id, store_id, new_status)
    return ResponseBase(data=order)
