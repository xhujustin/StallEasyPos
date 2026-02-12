from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.services.adjustment_service import AdjustmentService
from app.schemas.adjustments import AdjustmentCreate
from app.schemas.common import ResponseBase

from pydantic import BaseModel, ConfigDict
from datetime import date
from app.models.adjustment import AdjustmentType

class AdjustmentOut(BaseModel):
    id: int
    business_date: date
    adjustment_type: AdjustmentType
    amount: float
    reason_code: str
    model_config = ConfigDict(from_attributes=True)

router = APIRouter()

@router.post("/", response_model=ResponseBase[AdjustmentOut])
async def create_adjustment(
    store_id: Annotated[int, Query()],
    adj_in: AdjustmentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """
    建立更正單
    """
    adj = await AdjustmentService.create_adjustment(db, store_id, adj_in, current_user_id)
    return ResponseBase(data=adj)
