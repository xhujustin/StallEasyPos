from datetime import date
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.closing import DailyClosing
from app.models.order import Order, OrderStatus, PaymentMethod
from app.schemas.closing import ClosingCreate
from app.services.store_service import StoreService

class ClosingService:
    @staticmethod
    async def create_daily_closing(
        db: AsyncSession, store_id: int, closing_in: ClosingCreate, user_id: int
    ) -> DailyClosing:
        """
        執行日結 (鎖帳)
        1. Calculate Expected Cash (Sum of cash orders)
        2. Compare with Actual Cash
        3. Lock
        """
        # Permission
        await StoreService.get_store_if_authorized(db, store_id, user_id)
        
        # Check if already closed
        today = date.today()
        existing = await db.execute(
            select(DailyClosing).where(
                DailyClosing.store_id == store_id,
                DailyClosing.business_date == today
            )
        )
        if existing.scalars().first():
            raise HTTPException(status_code=400, detail="Daily closing already done for today")

        # Calculate Expected Cash
        # Sum total_amount of orders where status=PAID/COMPLETED and method=CASH and business_date=today
        
        stmt = select(func.sum(Order.total_amount)).where(
            Order.store_id == store_id,
            Order.business_date == today,
            Order.payment_method == PaymentMethod.CASH,
            Order.status.in_([OrderStatus.PAID, OrderStatus.COMPLETED])
        )
        
        result = await db.execute(stmt)
        expected_cash = result.scalar() or 0.0
        expected_cash = float(expected_cash)
        
        closing = DailyClosing(
            store_id=store_id,
            business_date=today,
            expected_cash=expected_cash,
            actual_cash=closing_in.actual_cash,
            short_over=closing_in.actual_cash - expected_cash,
            locked_by=user_id
        )
        db.add(closing)
        await db.commit()
        await db.refresh(closing)
        return closing
