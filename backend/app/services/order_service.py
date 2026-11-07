from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from sqlalchemy.orm import selectinload

from app.models.order import Order, OrderItem, OrderStatus, OrderType, PaymentMethod
from app.models.product import Product
from app.models.product_material import ProductMaterial
from app.schemas.orders import OrderCreate
from app.services.store_service import StoreService

from app.models.product_attribute import ProductAttribute, ProductAttributeOption, OptionMaterial
from app.services.material_service import MaterialService
from app.services.shift_service import ShiftService
from app.services.setting_service import SettingService
from app.models.system_setting import SettingScope
from app.services.store_clock import get_store_clock

class OrderService:
    @staticmethod
    async def get_next_order_no(db: AsyncSession, store_id: int, user_id: int) -> int:
        """取得店鋪目前班次的下一個可用單號。"""
        await StoreService.get_store_if_authorized(db, store_id, user_id)
        _, business_date = await get_store_clock(db, store_id)
        current_shift = await ShiftService.get_active_shift(db, store_id)
        query = (
            select(func.max(Order.order_no))
            .where(Order.store_id == store_id)
            .where(Order.order_no < 10_000_000)
        )
        if current_shift:
            query = query.where(Order.shift_id == current_shift.id)
        else:
            # 保留未開班建單的既有行為，以營業日為編號範圍。
            query = query.where(Order.shift_id.is_(None)).where(Order.business_date == business_date)
        result = await db.execute(query)
        return (result.scalar() or 0) + 1

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
        timezone_name, business_date = await get_store_clock(db, store_id)

        # 1.5 Get Current Shift (Automatic Association)
        # We try to associate the order with the currently OPEN shift for this store.
        # If no open shift, it might be a pre-order or error, but let's allow it with null shift_id for now (or could enforce).
        # For POS, we usually expect a shift to be open.
        current_shift = await ShiftService.get_active_shift(db, store_id)
        shift_id = current_shift.id if current_shift else None
        shift_number = current_shift.shift_number if current_shift else None

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

        # 3. Generate Order No (Shift Reset)
        # Sequence: 1, 2, 3... resets whenever a new shift is opened.
        
        order_number_query = (
            select(func.max(Order.order_no))
            .where(Order.store_id == store_id)
            .where(Order.order_no < 10_000_000) # Ignore legacy date-based numbers
        )
        if shift_id is not None:
            order_number_query = order_number_query.where(Order.shift_id == shift_id)
        else:
            order_number_query = order_number_query.where(Order.shift_id.is_(None)).where(
                Order.business_date == business_date
            )
        res = await db.execute(order_number_query)
        max_no = res.scalar() or 0
        new_order_no = max_no + 1

        # POS 可先顯示並隨掛單保存預定單號。若該號已被其他設備使用，
        # 則回退到資料庫目前的下一號，避免唯一鍵衝突。
        requested_order_no = order_in.order_no
        if requested_order_no and 0 < requested_order_no < 10_000_000:
            requested_query = (
                select(Order.id)
                .where(Order.store_id == store_id)
                .where(Order.order_no == requested_order_no)
            )
            if shift_id is not None:
                requested_query = requested_query.where(Order.shift_id == shift_id)
            else:
                requested_query = requested_query.where(Order.shift_id.is_(None)).where(
                    Order.business_date == business_date
                )
            requested_result = await db.execute(requested_query)
            if requested_result.scalar_one_or_none() is None:
                new_order_no = requested_order_no

        # 4. Prepare Order Items with Snapshot
        order_items = []
        calculated_total = 0.0

        for item_in in order_in.items:
            # Fetch product for snapshot
            product = None
            if item_in.product_id:
                product_result = await db.execute(
                    select(Product)
                    .where(Product.id == item_in.product_id)
                    .options(
                        selectinload(Product.materials).selectinload(ProductMaterial.material)
                    )
                )
                product = product_result.scalars().first()
            
            if product:
                name_snapshot = product.name
                price_snapshot = float(product.price)
                if product.cost is not None:
                    cost_snapshot = float(product.cost)
                else:
                    cost_snapshot = sum(
                        float(product_material.quantity) * float(product_material.material.unit_cost)
                        for product_material in product.materials
                        if product_material.material is not None
                    )
                # Deduct the base recipe as part of the same transaction as the order.
                for product_material in product.materials:
                    deduct_qty = -1 * (product_material.quantity * Decimal(str(item_in.quantity)))
                    await MaterialService.apply_usage(
                        db, product_material.material_id, store_id, deduct_qty
                    )
            else:
                # Handle custom item or deleted product logic (Simplified: Error if not found)
                raise HTTPException(status_code=400, detail=f"Product {item_in.product_id} not found")

            # Calculate line total with options and Deduct Inventory
            options_adjustment = 0.0
            options_data = None
            removable_recipe_quantities = {
                product_material.material_id: Decimal(str(product_material.quantity))
                for product_material in product.materials
            }
            
            if item_in.options:
                options_data = []
                for opt_in in item_in.options:
                    # 5. Option inventory adjustment.
                    # Positive quantities add ingredients; negative quantities remove
                    # ingredients from the base recipe. A replacement is represented by
                    # one negative row for the original ingredient and one positive row
                    # for its replacement. Cost and stock therefore use the same signed
                    # adjustment and cancellation can reverse it exactly.
                    # 查詢選項並預加載耗材設定
                    # 注意: 這裡是在迴圈中查詢，若選項極多可能會影響效能 (N+1)，但在 POS 場景下通常選項不多。
                    # 優化方向: 可先收集所有 option_id 一次查詢。
                    opt_result = await db.execute(
                        select(ProductAttributeOption)
                        .join(
                            ProductAttribute,
                            ProductAttribute.id == ProductAttributeOption.attribute_id,
                        )
                        .where(ProductAttributeOption.id == opt_in.option_id)
                        .where(ProductAttribute.product_id == product.id)
                        .options(
                            selectinload(ProductAttributeOption.materials)
                            .selectinload(OptionMaterial.material)
                        )
                    )
                    db_option = opt_result.scalars().first()

                    if db_option is None or not db_option.is_active:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Option {opt_in.option_id} is not available for product {product.id}",
                        )

                    # Never trust the client-provided name or price. Snapshot the
                    # server-side option and its signed material adjustments so a
                    # later option edit cannot corrupt cancellation/restocking.
                    options_adjustment += float(db_option.price_adjustment)
                    has_added_material = any(material.quantity > 0 for material in db_option.materials)
                    has_removed_material = any(material.quantity < 0 for material in db_option.materials)
                    operation_type = (
                        "replace" if has_added_material and has_removed_material
                        else "remove" if has_removed_material
                        else "add" if has_added_material
                        else "none"
                    )
                    option_snapshot = {
                        "attribute_id": db_option.attribute_id,
                        "attribute_name": opt_in.attribute_name,
                        "option_id": db_option.id,
                        "option_name": db_option.name,
                        "price_adjustment": float(db_option.price_adjustment),
                        "operation_type": operation_type,
                        "materials": [
                            {
                                "material_id": option_material.material_id,
                                "quantity": float(option_material.quantity),
                            }
                            for option_material in db_option.materials
                        ],
                    }
                    options_data.append(option_snapshot)

                    if db_option.materials:
                        for opt_mat in db_option.materials:
                            if opt_mat.quantity < 0:
                                remaining_quantity = removable_recipe_quantities.get(
                                    opt_mat.material_id, Decimal("0")
                                )
                                removed_quantity = abs(opt_mat.quantity)
                                if removed_quantity > remaining_quantity:
                                    material_name = (
                                        opt_mat.material.name
                                        if opt_mat.material is not None
                                        else str(opt_mat.material_id)
                                    )
                                    raise HTTPException(
                                        status_code=400,
                                        detail=(
                                            f"Option '{db_option.name}' removes {removed_quantity} "
                                            f"of material '{material_name}', but only "
                                            f"{remaining_quantity} exists in the base recipe"
                                        ),
                                    )
                                removable_recipe_quantities[opt_mat.material_id] = (
                                    remaining_quantity - removed_quantity
                                )
                            if opt_mat.material is not None:
                                cost_snapshot += float(opt_mat.quantity) * float(opt_mat.material.unit_cost)
                            # A negative option quantity produces a positive usage change,
                            # offsetting the base recipe deduction for a removed ingredient.
                            deduct_qty = -1 * (opt_mat.quantity * Decimal(str(item_in.quantity)))
                            await MaterialService.apply_usage(
                                db, opt_mat.material_id, store_id, deduct_qty
                            )

            cost_snapshot = max(0.0, cost_snapshot)
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
                options=options_data,
                skip_printing=product.skip_printing,
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
        taxable_amount = max(0, order_in.subtotal + order_in.service_fee - order_in.discount_amount)
        configured_tax_rate = await SettingService.get_setting(db, store_id, "tax_rate", SettingScope.STORE)
        tax_rate = min(100.0, max(0.0, float(5 if configured_tax_rate is None else configured_tax_rate)))
        configured_tax_mode = str(await SettingService.get_setting(db, store_id, "tax_mode", SettingScope.STORE) or "inclusive")
        tax_mode = configured_tax_mode if configured_tax_mode in {"inclusive", "exclusive"} else "inclusive"
        tax_amount = taxable_amount - (taxable_amount / (1 + tax_rate / 100)) if tax_mode == "inclusive" and tax_rate > 0 else taxable_amount * tax_rate / 100
        expected_total = taxable_amount if tax_mode == "inclusive" else taxable_amount + tax_amount
        if abs(expected_total - order_in.total_amount) > 1.0: # Allow rounding tolerance
             raise HTTPException(
                status_code=400, 
                detail=f"Total mismatch after tax calculation. Expected: {expected_total}, Received: {order_in.total_amount}"
            )

        if order_in.order_type == OrderType.DELIVERY:
            if not order_in.delivery_platform or not order_in.delivery_platform.strip():
                raise HTTPException(status_code=422, detail="外送訂單必須指定外送平台")
            if order_in.payment_method != PaymentMethod.PLATFORM_COLLECT:
                raise HTTPException(status_code=422, detail="外送訂單支付方式必須為平台代收")
        elif order_in.payment_method == PaymentMethod.LINEPAY and (
            not order_in.payment_provider or not order_in.payment_provider.strip()
        ):
            raise HTTPException(status_code=422, detail="多元支付必須指定支付方式")

        # 7. Create Order
        order = Order(
            store_id=store_id,
            order_no=new_order_no,
            idempotency_key=order_in.idempotency_key,
            subtotal=order_in.subtotal,
            service_fee=order_in.service_fee,
            service_fee_rate=order_in.service_fee_rate,
            tax_rate=tax_rate,
            tax_mode=tax_mode,
            tax_amount=tax_amount,
            order_type=order_in.order_type,
            total_amount=order_in.total_amount,
            status=OrderStatus.PAID if order_in.payment_method else OrderStatus.PENDING_PAYMENT,
            source=order_in.source,
            payment_method=order_in.payment_method,
            delivery_platform=order_in.delivery_platform,
            payment_provider=order_in.payment_provider,
            items=order_items, # Relationship magic
            created_by_id=user_id,
            cash_received=order_in.cash_received,
            change_amount=order_in.change_amount,
            timezone=timezone_name,
            business_date=business_date,
            discount_amount=order_in.discount_amount,
            discount_note=order_in.discount_note,
            shift_id=shift_id,
            shift_number=shift_number,
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

        if order.status == status:
            return order

        # Return all recipe ingredients when a paid order is cancelled. Both
        # the order state and stock ledger are committed in one transaction.
        if status == OrderStatus.CANCELLED:
            for item in order.items:
                recipe_result = await db.execute(
                    select(ProductMaterial).where(ProductMaterial.product_id == item.product_id)
                )
                for recipe in recipe_result.scalars().all():
                    restore_qty = recipe.quantity * Decimal(str(item.quantity))
                    await MaterialService.apply_usage(
                        db, recipe.material_id, store_id, restore_qty,
                        transaction_type="RESTOCK",
                        note=f"取消訂單 #{order.order_no} 還原配方庫存",
                    )

                for option_data in item.options or []:
                    option_id = option_data.get("option_id") if isinstance(option_data, dict) else None
                    if not option_id:
                        continue
                    material_snapshots = option_data.get("materials") or []
                    if material_snapshots:
                        for material_snapshot in material_snapshots:
                            restore_qty = Decimal(str(material_snapshot["quantity"])) * Decimal(str(item.quantity))
                            await MaterialService.apply_usage(
                                db, int(material_snapshot["material_id"]), store_id, restore_qty,
                                transaction_type="RESTOCK",
                                note=f"取消訂單 #{order.order_no} 還原選項庫存",
                            )
                        continue

                    # Backward compatibility for orders created before material
                    # adjustments were snapshotted on the order item.
                    option_result = await db.execute(
                        select(OptionMaterial).where(OptionMaterial.option_id == option_id)
                    )
                    for option_material in option_result.scalars().all():
                        restore_qty = option_material.quantity * Decimal(str(item.quantity))
                        await MaterialService.apply_usage(
                            db, option_material.material_id, store_id, restore_qty,
                            transaction_type="RESTOCK",
                            note=f"取消訂單 #{order.order_no} 還原選項庫存",
                        )

        order.status = status
        
        # 若是作廢/取消，記錄時間 (此處範例，可擴充 void_reason 等)
        if status in [OrderStatus.CANCELLED, OrderStatus.DRAFT]: # DRAFT as voided? or add VOID status
            order.is_voided = True
            order.voided_at = datetime.now()

        await db.commit()
        await db.refresh(order)
        return order
