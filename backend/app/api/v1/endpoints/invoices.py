from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.services.invoice_service import InvoiceService
from app.schemas.invoices import InvoiceRequest
from app.schemas.common import ResponseBase

# Define output schema locally or in schemas/invoices.py
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.models.invoice import InvoiceStatus

class InvoiceOut(BaseModel):
    id: int
    order_id: int
    status: InvoiceStatus
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

router = APIRouter()

@router.post("/", response_model=ResponseBase[InvoiceOut])
async def create_invoice(
    store_id: Annotated[int, Query()],
    request_in: InvoiceRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """
    開立發票請求
    """
    invoice = await InvoiceService.create_invoice_request(db, store_id, request_in, current_user_id)
    return ResponseBase(data=invoice)
