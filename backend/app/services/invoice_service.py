from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.invoice import InvoiceRecord, InvoiceStatus
from app.models.order import Order
from app.schemas.invoices import InvoiceRequest
from app.services.store_service import StoreService

class InvoiceService:
    @staticmethod
    async def create_invoice_request(
        db: AsyncSession, store_id: int, request_in: InvoiceRequest, user_id: int
    ) -> InvoiceRecord:
        """
        建立發票開立請求 (Pending)
        User -> POS -> Create Invoice Record -> Worker/Provider processes it
        """
        # Permission
        await StoreService.get_store_if_authorized(db, store_id, user_id)
        
        # Verify Order
        order = await db.get(Order, request_in.order_id)
        if not order or order.store_id != store_id:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Check existing
        result = await db.execute(select(InvoiceRecord).where(InvoiceRecord.order_id == request_in.order_id))
        if exist := result.scalars().first():
            return exist

        invoice = InvoiceRecord(
            store_id=store_id,
            order_id=request_in.order_id,
            status=InvoiceStatus.PENDING
        )
        db.add(invoice)
        await db.commit()
        await db.refresh(invoice)
        return invoice
