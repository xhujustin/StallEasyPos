from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from sqlalchemy.orm import selectinload

from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.schemas.orders import OrderCreate
from app.services.store_service import StoreService

class OrderService:
    @staticmethod
    async def create_order(
        db: AsyncSession, store_id: int, order_in: OrderCreate, user_id: int
    ) -> Order:
        """
        建立訂單 (核心交易)
        1. Idempotency Check
        2. Permission Check
        3. Generate Order No
        4. Snapshot Product Data
        """
        # 1. 驗證權限
        await StoreService.get_store_if_authorized(db, store_id, user_id)

        # 2. Idempotency Check (Store Scope)
        result = await db.execute(
            select(Order).where(
                Order.store_id == store_id, 
                Order.idempotency_key == order_in.idempotency_key
            ).options(selectinload(Order.items))
        )
        existing_order = result.scalars().first()
        if existing_order:
            return existing_order

        # 3. Generate Order No (Monotonic per store)
        # Note: In high concurrency, this needs locking or retry. 
        # For simplicity in V1 (mostly offline/single device per store sync), we use max+1
        res = await db.execute(
            select(func.max(Order.order_no)).where(Order.store_id == store_id)
        )
        max_no = res.scalar() or 0
        new_order_no = max_no + 1

        # 4. Prepare Order Items with Snapshot
        order_items = []
        calculated_total = 0.0

        for item_in in order_in.items:
            # Fetch product for snapshot
            product = None
            if item_in.product_id:
                product = await db.get(Product, item_in.product_id)
            
            if product:
                name_snapshot = product.name
                price_snapshot = float(product.price)
                cost_snapshot = float(product.cost) if product.cost else 0
            else:
                # Handle custom item or deleted product logic (Simplified: Error if not found)
                raise HTTPException(status_code=400, detail=f"Product {item_in.product_id} not found")

            # Calculate line total
            line_total = price_snapshot * item_in.quantity
            calculated_total += line_total

            db_item = OrderItem(
                product_id=item_in.product_id,
                name_snapshot=name_snapshot,
                price_snapshot=price_snapshot,
                cost_snapshot=cost_snapshot,
                quantity=item_in.quantity,
                note=item_in.note
            )
            order_items.append(db_item)

        # 5. Validate Total
        # Tolerate small float diff
        if abs(calculated_total - order_in.total_amount) > 0.05: # Allow 0.05 diff
             raise HTTPException(
                status_code=400, 
                detail=f"Total amount mismatch. Calculated: {calculated_total}, Received: {order_in.total_amount}"
            )

        # 6. Create Order
        order = Order(
            store_id=store_id,
            order_no=new_order_no,
            idempotency_key=order_in.idempotency_key,
            total_amount=order_in.total_amount,
            status=OrderStatus.PENDING_PAYMENT,
            source=order_in.source,
            payment_method=order_in.payment_method,
            items=order_items # Relationship magic
        )
        
        db.add(order)
        await db.commit()
        await db.refresh(order)
        
        # Explicitly reload order with items for return using selectinload
        # This ensures the 'items' relationship is populated for Pydantic serialization
        result = await db.execute(
            select(Order).where(Order.id == order.id).options(selectinload(Order.items))
        )
        order_loaded = result.scalars().first()
        return order_loaded

    @staticmethod
    async def get_store_orders(
        db: AsyncSession, store_id: int, user_id: int, limit: int = 100
    ) -> List[Order]:
        """
        取得店鋪訂單列表
        """
        await StoreService.get_store_if_authorized(db, store_id, user_id)
        
        result = await db.execute(
            select(Order)
            .where(Order.store_id == store_id)
            .order_by(Order.created_at.desc())
            .limit(limit)
            .options(selectinload(Order.items))
        )
        return result.scalars().all()
