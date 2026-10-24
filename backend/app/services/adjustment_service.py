from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.adjustment import Adjustment
from app.schemas.adjustments import AdjustmentCreate
from app.services.store_service import StoreService
from app.services.store_clock import get_store_clock

class AdjustmentService:
    @staticmethod
    async def create_adjustment(
        db: AsyncSession, store_id: int, adj_in: AdjustmentCreate, user_id: int
    ) -> Adjustment:
        """
        建立更正單 (Append Only)
        """
        # Permission
        await StoreService.get_store_if_authorized(db, store_id, user_id)
        _, business_date = await get_store_clock(db, store_id)
        
        adj = Adjustment(
            store_id=store_id,
            business_date=business_date,
            created_by=user_id,
            **adj_in.model_dump() # adjustment_type, amount, reason...
        )
        
        db.add(adj)
        await db.commit()
        await db.refresh(adj)
        return adj
