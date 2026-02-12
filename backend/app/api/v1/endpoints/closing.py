from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.services.closing_service import ClosingService
from app.schemas.closing import ClosingCreate, ClosingOut
from app.schemas.common import ResponseBase
from datetime import date

router = APIRouter()

@router.post("/", response_model=ResponseBase[ClosingOut])
async def create_closing(
    store_id: Annotated[int, Query()],
    closing_in: ClosingCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """
    執行日結
    """
    closing = await ClosingService.create_daily_closing(db, store_id, closing_in, current_user_id)
    return ResponseBase(data=closing)
