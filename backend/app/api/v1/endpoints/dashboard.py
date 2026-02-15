from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import DashboardStats
from app.schemas.common import ResponseBase

router = APIRouter()

@router.get("/stats", response_model=ResponseBase[DashboardStats])
async def get_dashboard_stats(
    store_id: Annotated[int, Query(...)],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)],
    trend_days: Annotated[int, Query()] = 7,
):
    """
    取得儀表板統計數據 (營收、訂單數、熱銷商品)
    """
    stats = await DashboardService.get_stats(db, store_id, current_user_id, trend_days)
    return ResponseBase(data=stats)
