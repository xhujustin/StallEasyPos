from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from sqlalchemy.orm import selectinload

from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.schemas.orders import OrderCreate
from app.services.store_service import StoreService

from app.models.product_attribute import ProductAttributeOption
from app.services.material_service import MaterialService
from app.services.shift_service import ShiftService

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
        5. Option Inventory Deduction
        """
        # 1. 驗證權限
        await StoreService.get_store_if_authorized(db, store_id, user_id)

        # 1.5 Get Current Shift (Automatic Association)
        # We try to associate the order with the currently OPEN shift for this store.
        # If no open shift, it might be a pre-order or error, but let's allow it with null shift_id for now (or could enforce).
        # For POS, we usually expect a shift to be open.
        current_shift = await ShiftService.get_active_shift(db, store_id)
        shift_id = current_shift.id if current_shift else None

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

        # 3. Generate Order No (Daily Reset)
        # Sequence: 1, 2, 3... resets every business day per store.
        
        res = await db.execute(
            select(func.max(Order.order_no))
            .where(Order.store_id == store_id)
            .where(Order.business_date == date.today())
            .where(Order.order_no < 10_000_000) # Ignore legacy date-based numbers
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

            # Calculate line total with options and Deduct Inventory
            options_adjustment = 0.0
            options_data = None
            
            if item_in.options:
                options_data = []
                for opt_in in item_in.options:
                    # 記錄選項資料
                    options_data.append(opt_in.model_dump())
                    options_adjustment += float(opt_in.price_adjustment)

                    # 5. Option Inventory Deduction (扣除選項耗材庫存)
                    # 查詢選項並預加載耗材設定
                    # 注意: 這裡是在迴圈中查詢，若選項極多可能會影響效能 (N+1)，但在 POS 場景下通常選項不多。
                    # 優化方向: 可先收集所有 option_id 一次查詢。
                    opt_result = await db.execute(
                        select(ProductAttributeOption)
                        .where(ProductAttributeOption.id == opt_in.option_id)
                        .options(selectinload(ProductAttributeOption.materials))
                    )
                    db_option = opt_result.scalars().first()

                    if db_option and db_option.materials:
                        for opt_mat in db_option.materials:
                            # 扣除數量 = 訂單數量 * 耗材設定數量
                            # 例如: 2 杯珍奶 * 每杯 50g 珍珠 = 扣除 100g
                            # 注意: opt_mat.quantity 是 Decimal, item_in.quantity 是 int/float, 需轉換
                            deduct_qty = -1 * (opt_mat.quantity * Decimal(str(item_in.quantity)))
                            await MaterialService.update_stock(
                                db, opt_mat.material_id, store_id, deduct_qty
                            )

            final_unit_price = price_snapshot + options_adjustment
            line_total = final_unit_price * item_in.quantity
            calculated_total += line_total

            db_item = OrderItem(
                product_id=item_in.product_id,
                name_snapshot=name_snapshot,
                price_snapshot=final_unit_price,
                cost_snapshot=cost_snapshot,
                quantity=item_in.quantity,
                note=item_in.note,
                options=options_data
            )
            order_items.append(db_item)

        # 6. Validate Total
        # Tolerate small float diff due to service fee and rounding
        if abs(calculated_total - order_in.subtotal) > 0.1:
             raise HTTPException(
                status_code=400, 
                detail=f"Subtotal mismatch. Calculated: {calculated_total}, Received: {order_in.subtotal}"
            )
        
        # 6. Validate Total
        # expected = subtotal + service_fee - discount
        expected_total = order_in.subtotal + order_in.service_fee - order_in.discount_amount
        if abs(expected_total - order_in.total_amount) > 1.0: # Allow rounding tolerance
             raise HTTPException(
                status_code=400, 
                detail=f"Total mismatch. (Subtotal+ServiceFee-Discount): {expected_total}, Received total_amount: {order_in.total_amount}"
            )

        # 7. Create Order
        order = Order(
            store_id=store_id,
            order_no=new_order_no,
            idempotency_key=order_in.idempotency_key,
            subtotal=order_in.subtotal,
            service_fee=order_in.service_fee,
            service_fee_rate=order_in.service_fee_rate,
            order_type=order_in.order_type,
            total_amount=order_in.total_amount,
            status=OrderStatus.PAID if order_in.payment_method else OrderStatus.PENDING_PAYMENT,
            source=order_in.source,
            payment_method=order_in.payment_method,
            items=order_items, # Relationship magic
            created_by_id=user_id,
            cash_received=order_in.cash_received,
            change_amount=order_in.change_amount,
            discount_amount=order_in.discount_amount,
            discount_note=order_in.discount_note,
            shift_id=shift_id
        )
        
        db.add(order)
        await db.commit()
        await db.refresh(order)
        
        # Explicitly reload order with items and creator for return
        result = await db.execute(
            select(Order)
            .where(Order.id == order.id)
            .options(
                selectinload(Order.items),
                selectinload(Order.created_by)
            )
        )
        order_loaded = result.scalars().first()
        return order_loaded

    @staticmethod
    async def get_store_orders(
        db: AsyncSession, 
        store_id: int, 
        user_id: int, 
        status: Optional[OrderStatus] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        search: Optional[str] = None,
        shift_id: Optional[int] = None,
        limit: int = 100
    ) -> List[Order]:
        """
        取得店鋪訂單列表 (支援篩選)
        """
        await StoreService.get_store_if_authorized(db, store_id, user_id)
        
        query = select(Order).where(Order.store_id == store_id)

        if status:
            query = query.where(Order.status == status)
        
        if start_date:
            query = query.where(Order.business_date >= start_date)
            
        if end_date:
            query = query.where(Order.business_date <= end_date)

        if search:
            # 支援依訂單編號搜尋 (轉字串後模糊搜尋，或精確搜尋)
            # 這裡假設搜尋訂單號碼
            if search.isdigit():
                query = query.where(Order.order_no == int(search))

        if shift_id:
            query = query.where(Order.shift_id == shift_id)

        # Eager load items and creator (and creator's roles?)
        # To get role, we might need to do a separate query or join.
        # For now, let's load created_by.
        result = await db.execute(
            query
            .order_by(Order.created_at.desc())
            .limit(limit)
            .options(
                selectinload(Order.items),
                selectinload(Order.created_by)
            )
        )
        orders = result.scalars().all()
        
        # Populate creator_role manually (Avoid complex join for now)
        # We need to find the user's role in THIS store.
        # This is N+1 if we query for each order.
        # Optimization: Fetch all unique creator_ids, get their roles in this store map.
        
        creator_ids = {o.created_by_id for o in orders if o.created_by_id}
        if creator_ids:
            from app.models.user import StoreUser
            role_res = await db.execute(
                select(StoreUser.user_id, StoreUser.role)
                .where(StoreUser.store_id == store_id, StoreUser.user_id.in_(creator_ids))
            )
            role_map = {row.user_id: row.role for row in role_res.all()}
            
            for o in orders:
                if o.created_by_id and o.created_by_id in role_map:
                    # Dynamically set attribute for Pydantic (it's not a DB column)
                    setattr(o, 'creator_role', role_map[o.created_by_id])
        
        return orders

    @staticmethod
    async def update_order_status(
        db: AsyncSession, order_id: int, store_id: int, status: OrderStatus
    ) -> Order:
        """
        更新訂單狀態 (如: 取消、作廢、完成)
        """
        result = await db.execute(
            select(Order)
            .where(Order.id == order_id, Order.store_id == store_id)
            .options(selectinload(Order.items))
        )
        order = result.scalars().first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        # Status Check Logic
        print(f"[DEBUG] Updating Order {order_id} to {status}. Current: {order.status}")
        
        # 狀態檢核 (簡化版，可擴充狀態機邏輯)
        if order.status == OrderStatus.CANCELLED and status != OrderStatus.CANCELLED:
             raise HTTPException(status_code=400, detail="Cannot change status of cancelled order")

        order.status = status
        
        # 若是作廢/取消，記錄時間 (此處範例，可擴充 void_reason 等)
        if status in [OrderStatus.CANCELLED, OrderStatus.DRAFT]: # DRAFT as voided? or add VOID status
            order.is_voided = True
            order.voided_at = datetime.now()
            # Note: Inventory restoration is NOT implemented here yet as per plan.

        await db.commit()
        await db.refresh(order)
        return order
