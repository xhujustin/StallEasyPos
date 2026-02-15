from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.services.shift_service import ShiftService
from app.schemas.shift import ShiftOut, ShiftCreate, ShiftClose, CashOperation
from app.schemas.common import ResponseBase

router = APIRouter()

@router.get("/current", response_model=ResponseBase[ShiftOut | None])
async def get_current_shift(
    store_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    取得該店鋪目前開啟的班次
    """
    shift = await ShiftService.get_active_shift(db, store_id)
    return ResponseBase(data=shift)

@router.post("/start", response_model=ResponseBase[ShiftOut])
async def start_shift(
    data: ShiftCreate,
    store_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
) -> Any:
    """
    開啟新班次
    """
    shift = await ShiftService.start_shift(db, store_id=store_id, user_id=current_user_id, initial_cash=data.initial_cash)
    return ResponseBase(data=shift)

@router.post("/{shift_id}/close", response_model=ResponseBase[ShiftOut])
async def close_shift(
    shift_id: int,
    data: ShiftClose,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
) -> Any:
    """
    關閉班次並結算
    """
    shift = await ShiftService.close_shift(db, shift_id=shift_id, user_id=current_user_id, final_cash=data.final_cash)
    return ResponseBase(data=shift)

@router.post("/{shift_id}/cash", response_model=ResponseBase[ShiftOut])
async def modify_shift_cash(
    shift_id: int,
    data: CashOperation,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
) -> Any:
    """
    修改班次現金 (補錢/取款)
    """
    shift = await ShiftService.modify_cash(
        db, 
        shift_id=shift_id, 
        user_id=current_user_id, 
        amount=data.amount, 
        type=data.type, 
        reason=data.reason
    )
    return ResponseBase(data=shift)

@router.get("/", response_model=ResponseBase[List[ShiftOut]])
async def get_shift_history(
    store_id: int = Query(...),
    skip: int = 0,
    limit: int = 20,
    start_date: str = Query(None),
    end_date: str = Query(None),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    取得歷史班次
    """
    shifts = await ShiftService.get_shift_history(db, store_id, limit=limit, offset=skip, start_date=start_date, end_date=end_date)
    return ResponseBase(data=shifts)

@router.get("/{shift_id}/stats", response_model=ResponseBase[Any])
async def get_shift_stats(
    shift_id: int,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    取得班次即時統計
    """
    stats = await ShiftService.get_shift_stats(db, shift_id)
    if stats is None:
        raise HTTPException(status_code=404, detail="Shift not found")
    return ResponseBase(data=stats)
