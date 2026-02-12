from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.services.payment_service import PaymentService
from app.schemas.payments import PaymentCreate, PaymentOut
from app.schemas.common import ResponseBase

router = APIRouter()

@router.post("/", response_model=ResponseBase[PaymentOut])
async def create_payment(
    store_id: Annotated[int, Query()],
    payment_in: PaymentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """
    建立支付
    """
    payment = await PaymentService.create_payment(db, store_id, payment_in, current_user_id)
    return ResponseBase(data=payment)
