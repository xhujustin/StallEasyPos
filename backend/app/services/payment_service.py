from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.payment import Payment, PaymentStatus
from app.models.order import Order, OrderStatus
from app.schemas.payments import PaymentCreate
from app.services.store_service import StoreService

class PaymentService:
    @staticmethod
    async def create_payment(
        db: AsyncSession, store_id: int, payment_in: PaymentCreate, user_id: int
    ) -> Payment:
        """
        建立支付紀錄
        1. Idempotency Check
        2. Verify Order exists and belongs to store
        3. Create Payment
        4. Update Order Status (if full payment)
        """
        # 1. Permission
        await StoreService.get_store_if_authorized(db, store_id, user_id)

        # 2. Idempotency
        existing_payment = await db.execute(
            select(Payment).where(
                Payment.store_id == store_id, 
                Payment.idempotency_key == payment_in.idempotency_key
            )
        )
        if txn := existing_payment.scalars().first():
            return txn

        # 3. Verify Order
        order = await db.get(Order, payment_in.order_id)
        if not order or order.store_id != store_id:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # 4. Create Payment
        payment = Payment(
            store_id=store_id,
            status=PaymentStatus.SUCCESS, # Assuming direct POS cash/external payment success for now
            **payment_in.model_dump()
        )
        db.add(payment)
        
        # 5. Update Order Status
        # Simple logic: if payment amount >= order total, mark paid
        if payment.amount >= order.total_amount:
            order.status = OrderStatus.PAID
            order.payment_method = payment.method # Update main method
        
        await db.commit()
        await db.refresh(payment)
        return payment
