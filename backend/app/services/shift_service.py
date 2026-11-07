from datetime import datetime
from decimal import Decimal


from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case, update
from sqlalchemy.orm import joinedload
from fastapi import HTTPException

from app.models.shift import Shift, ShiftStatus, ShiftTransaction, ShiftExpense
from app.models.order import Order, OrderItem, OrderStatus, PaymentMethod
from app.models.product import Product
from app.models.product_material import ProductMaterial
from app.models.material import Material
from app.services.store_clock import get_store_clock


def order_cost_query(shift: Shift, end_time: datetime):
    """Build COGS query, falling back only when a legacy item has no snapshot."""
    recipe_costs = (
        select(
            ProductMaterial.product_id.label("product_id"),
            func.sum(ProductMaterial.quantity * Material.unit_cost).label("recipe_cost"),
        )
        .join(Material, Material.id == ProductMaterial.material_id)
        .group_by(ProductMaterial.product_id)
        .subquery()
    )
    unit_cost = func.coalesce(
        OrderItem.cost_snapshot,
        Product.cost,
        recipe_costs.c.recipe_cost,
        0,
    )
    return (
        select(func.coalesce(func.sum(unit_cost * OrderItem.quantity), 0).label("cost"))
        .join(Order, OrderItem.order_id == Order.id)
        .outerjoin(Product, Product.id == OrderItem.product_id)
        .outerjoin(recipe_costs, recipe_costs.c.product_id == OrderItem.product_id)
        .where(
            Order.store_id == shift.store_id,
            Order.created_at >= shift.start_time,
            Order.created_at <= end_time,
            Order.status.in_([OrderStatus.PAID, OrderStatus.COMPLETED]),
        )
    )


async def seal_missing_order_cost_snapshots(db: AsyncSession, shift: Shift, end_time: datetime) -> None:
    """Persist legacy missing costs at close so later recipe/cost edits cannot alter the shift."""
    recipe_costs = (
        select(
            ProductMaterial.product_id.label("product_id"),
            func.sum(ProductMaterial.quantity * Material.unit_cost).label("recipe_cost"),
        )
        .join(Material, Material.id == ProductMaterial.material_id)
        .group_by(ProductMaterial.product_id)
        .subquery()
    )
    frozen_cost = func.coalesce(Product.cost, recipe_costs.c.recipe_cost, 0)
    query = (
        select(OrderItem.id, frozen_cost.label("frozen_cost"))
        .join(Order, OrderItem.order_id == Order.id)
        .outerjoin(Product, Product.id == OrderItem.product_id)
        .outerjoin(recipe_costs, recipe_costs.c.product_id == OrderItem.product_id)
        .where(
            Order.store_id == shift.store_id,
            Order.created_at >= shift.start_time,
            Order.created_at <= end_time,
            Order.status.in_([OrderStatus.PAID, OrderStatus.COMPLETED]),
            OrderItem.cost_snapshot.is_(None),
        )
    )
    rows = (await db.execute(query)).all()
    for item_id, frozen_cost_value in rows:
        await db.execute(
            update(OrderItem)
            .where(OrderItem.id == item_id, OrderItem.cost_snapshot.is_(None))
            .values(cost_snapshot=frozen_cost_value or 0)
        )

class ShiftService:
    @staticmethod
    async def get_expenses(db: AsyncSession, shift_id: int) -> list[ShiftExpense]:
        result = await db.execute(select(ShiftExpense).where(ShiftExpense.shift_id == shift_id).order_by(ShiftExpense.created_at.desc()))
        return list(result.scalars().all())

    @staticmethod
    async def create_expense(db: AsyncSession, shift_id: int, user_id: int, data) -> ShiftExpense:
        shift = await db.get(Shift, shift_id)
        if not shift:
            raise HTTPException(status_code=404, detail="找不到此班次")
        if shift.status != ShiftStatus.OPEN:
            raise HTTPException(status_code=400, detail="已結班，不能新增支出")
        if data.amount <= 0 or data.payment_method not in {"cash", "transfer", "card"}:
            raise HTTPException(status_code=422, detail="支出金額或付款方式不正確")
        expense = ShiftExpense(
            shift_id=shift_id, user_id=user_id, category=data.category.strip(), amount=Decimal(str(data.amount)),
            payment_method=data.payment_method, description=(data.description or "").strip() or None,
            supplier=(data.supplier or "").strip() or None,
        )
        if not expense.category:
            raise HTTPException(status_code=422, detail="請選擇支出分類")
        db.add(expense)
        await db.commit()
        await db.refresh(expense)
        return expense

    @staticmethod
    async def void_expense(db: AsyncSession, shift_id: int, expense_id: int) -> None:
        shift = await db.get(Shift, shift_id)
        if not shift or shift.status != ShiftStatus.OPEN:
            raise HTTPException(status_code=400, detail="只有開班中的支出可以作廢")
        expense = await db.get(ShiftExpense, expense_id)
        if not expense or expense.shift_id != shift_id:
            raise HTTPException(status_code=404, detail="找不到支出紀錄")
        expense.is_voided = True
        expense.voided_at = datetime.now()
        await db.commit()

    @staticmethod
    async def get_active_shift(db: AsyncSession, store_id: int) -> Shift | None:
        """
        取得該店鋪目前開啟的班次 (如果有)
        """
        # Get active shift for a store
        query = select(Shift).options(
            joinedload(Shift.opened_by),
            joinedload(Shift.transactions).joinedload(ShiftTransaction.user)
        ).where(
            Shift.store_id == store_id,
            Shift.status == ShiftStatus.OPEN
        ).order_by(Shift.start_time.desc(), Shift.id.desc())
        result = await db.execute(query)
        return result.scalars().first()

    @staticmethod
    async def start_shift(db: AsyncSession, store_id: int, user_id: int, initial_cash: float) -> Shift:
        """
        開啟新班次
        """
        # 檢查是否已有開啟的班次
        existing_shift = await ShiftService.get_active_shift(db, store_id)
        if existing_shift:
            raise HTTPException(status_code=400, detail="已經有開啟的班次，請先關閉當前班次")

        _, business_date = await get_store_clock(db, store_id)
        daily_prefix = int(business_date.strftime("%Y%m%d")) * 1000
        number_result = await db.execute(
            select(func.max(Shift.shift_number)).where(
                Shift.store_id == store_id,
                Shift.shift_number > daily_prefix,
                Shift.shift_number <= daily_prefix + 999,
            )
        )
        shift_number = (number_result.scalar() or daily_prefix) + 1

        new_shift = Shift(
            store_id=store_id,
            shift_number=shift_number,
            start_time=datetime.now(),
            initial_cash=initial_cash,
            opened_by_id=user_id,
            status=ShiftStatus.OPEN
        )
        db.add(new_shift)
        await db.commit()
        await db.refresh(new_shift)
        
        # Re-fetch with relationships for response
        return await ShiftService.get_active_shift(db, store_id)

    @staticmethod
    async def close_shift(db: AsyncSession, shift_id: int, user_id: int, final_cash: float) -> Shift:
        """
        關閉班次並結算
        """
        shift = await db.get(Shift, shift_id)
        if not shift:
            raise HTTPException(status_code=404, detail="找不到此班次")
        
        if shift.status != ShiftStatus.OPEN:
            raise HTTPException(status_code=400, detail="此班次已經關閉")

        end_time = datetime.now()
        
        # 1. 訂單統計 (營收、單量)
        stats_query = select(
            func.count(Order.id).label("count"),
            func.coalesce(func.sum(Order.total_amount), 0).label("revenue")
        ).where(
            Order.store_id == shift.store_id,
            Order.created_at >= shift.start_time,
            Order.created_at <= end_time,
            Order.status.in_([OrderStatus.PAID, OrderStatus.COMPLETED])
        )
        
        result = await db.execute(stats_query)
        stats = result.first()
        
        # 2. Seal legacy missing costs first, then calculate from immutable snapshots.
        await seal_missing_order_cost_snapshots(db, shift, end_time)
        cost_query = order_cost_query(shift, end_time)

        cost_res = await db.execute(cost_query)
        total_cost = cost_res.scalar() or 0
        
        # 3. 現金營收統計
        cash_sales_query = select(
            func.coalesce(func.sum(Order.total_amount), 0)
        ).where(
            Order.store_id == shift.store_id,
            Order.created_at >= shift.start_time,
            Order.created_at <= end_time,
            Order.status.in_([OrderStatus.PAID, OrderStatus.COMPLETED]),
            Order.payment_method == PaymentMethod.CASH
        )
        cash_res = await db.execute(cash_sales_query)
        cash_sales = cash_res.scalar() or 0
        
        revenue = stats.revenue if stats else 0
        order_count = stats.count if stats else 0
        total_net_profit = revenue - total_cost
        expense_result = await db.execute(select(
            func.coalesce(func.sum(ShiftExpense.amount), 0),
            func.coalesce(func.sum(case((ShiftExpense.payment_method == "cash", ShiftExpense.amount), else_=0)), 0),
        ).where(ShiftExpense.shift_id == shift.id, ShiftExpense.is_voided.is_(False)))
        total_expenses, cash_expenses = expense_result.one()
        
        shift.end_time = end_time
        shift.final_cash = final_cash
        shift.closed_by_id = user_id
        shift.status = ShiftStatus.CLOSED
        
        shift.order_count = order_count
        shift.total_sales = revenue
        shift.cash_sales = cash_sales
        shift.total_net_profit = total_net_profit
        shift.total_expenses = total_expenses
        shift.cash_expenses = cash_expenses

        await db.commit()
        await db.refresh(shift)
        
        # Re-fetch with relationships to avoid MissingGreenlet error during serialization
        query = select(Shift).options(
            joinedload(Shift.opened_by),
            joinedload(Shift.closed_by),
            joinedload(Shift.transactions).joinedload(ShiftTransaction.user)
        ).where(Shift.id == shift_id)
        result = await db.execute(query)
        return result.scalars().first()

    @staticmethod
    async def modify_cash(db: AsyncSession, shift_id: int, user_id: int, amount: float, type: str, reason: str = None) -> Shift:
        """
        修改班次現金 (補錢/取款)
        type: 'in' (補錢) or 'out' (取款)
        """
        shift = await db.get(Shift, shift_id)
        if not shift:
            raise HTTPException(status_code=404, detail="找不到此班次")
        
        if shift.status != ShiftStatus.OPEN:
            raise HTTPException(status_code=400, detail="此班次已經關閉")

        if type == 'in':
            shift.cash_added += Decimal(str(amount))
        elif type == 'out':
            shift.cash_removed += Decimal(str(amount))
        else:
            raise HTTPException(status_code=400, detail="無效的操作類型")

        # Log this transaction for audit
        transaction = ShiftTransaction(
            shift_id=shift_id,
            user_id=user_id,
            type=type,
            amount=Decimal(str(amount)),
            reason=reason
        )
        db.add(transaction)
        
        await db.commit()
        await db.refresh(shift)
        
        # Re-fetch with relationships for response schema
        query = select(Shift).options(
            joinedload(Shift.opened_by), 
            joinedload(Shift.closed_by),
            joinedload(Shift.transactions).joinedload(ShiftTransaction.user)
        ).where(Shift.id == shift_id)
        result = await db.execute(query)
        return result.scalars().first()

    @staticmethod
    async def get_shift_history(
        db: AsyncSession, 
        store_id: int, 
        limit: int = 10, 
        offset: int = 0,
        start_date: str = None,
        end_date: str = None
    ) -> list[Shift]:
        """
        取得歷史班次
        """
        # Get shifts with basic info and transaction logs
        query = select(Shift).options(
            joinedload(Shift.opened_by), 
            joinedload(Shift.closed_by),
            joinedload(Shift.transactions).joinedload(ShiftTransaction.user)
        ).where(Shift.store_id == store_id)

        if start_date:
            try:
                sd = datetime.strptime(start_date, '%Y-%m-%d')
                query = query.where(Shift.start_time >= sd)
            except ValueError:
                pass
        
        if end_date:
            try:
                ed = datetime.strptime(f"{end_date} 23:59:59", '%Y-%m-%d %H:%M:%S')
                query = query.where(Shift.start_time <= ed)
            except ValueError:
                pass

        query = query.order_by(Shift.start_time.desc()).offset(offset).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().unique().all()

    @staticmethod
    async def get_shift_stats(db: AsyncSession, shift_id: int) -> dict:
        """
        取得班次即時統計 (預覽用)
        """
        shift = await db.get(Shift, shift_id)
        if not shift:
            return None

        # Closed shifts are immutable reports. Never recalculate them from live
        # products, recipes, materials, or later cost changes.
        if shift.status == ShiftStatus.CLOSED:
            total_sales = Decimal(str(shift.total_sales or 0))
            net_profit = Decimal(str(shift.total_net_profit or 0))
            return {
                "order_count": shift.order_count,
                "total_sales": total_sales,
                "total_cost": total_sales - net_profit,
                "total_net_profit": net_profit,
                "cash_sales": shift.cash_sales,
                "total_expenses": shift.total_expenses,
                "cash_expenses": shift.cash_expenses,
                "net_operating_profit": net_profit - Decimal(str(shift.total_expenses or 0)),
                "cash_added": shift.cash_added,
                "cash_removed": shift.cash_removed,
            }
        
        end_time = datetime.now() if shift.status == ShiftStatus.OPEN else shift.end_time
        
        # 1. 訂單統計 (營收、單量、現金營收)
        stats_query = select(
            func.count(Order.id).label("count"),
            func.coalesce(func.sum(Order.total_amount), 0).label("revenue"),
            func.coalesce(func.sum(
                case((Order.payment_method == PaymentMethod.CASH, Order.total_amount), else_=0)
            ), 0).label("cash_revenue")
        ).where(
            Order.store_id == shift.store_id,
            Order.created_at >= shift.start_time,
            Order.created_at <= end_time,
            Order.status.in_([OrderStatus.PAID, OrderStatus.COMPLETED])
        )
        
        result = await db.execute(stats_query)
        stats = result.first()
        
        # 2. 成本統計 (從 OrderItem 計算)
        cost_query = order_cost_query(shift, end_time)

        cost_res = await db.execute(cost_query)
        total_cost = cost_res.scalar() or 0

        revenue = stats.revenue if stats else 0
        total_net_profit = revenue - total_cost
        expense_result = await db.execute(select(
            func.coalesce(func.sum(ShiftExpense.amount), 0),
            func.coalesce(func.sum(case((ShiftExpense.payment_method == "cash", ShiftExpense.amount), else_=0)), 0),
        ).where(ShiftExpense.shift_id == shift.id, ShiftExpense.is_voided.is_(False)))
        total_expenses, cash_expenses = expense_result.one()

        return {
            "order_count": stats.count if stats else 0,
            "total_sales": revenue,
            "total_cost": total_cost,
            "total_net_profit": total_net_profit,
            "cash_sales": stats.cash_revenue if stats else 0,
            "total_expenses": total_expenses,
            "cash_expenses": cash_expenses,
            "net_operating_profit": total_net_profit - total_expenses,
            "cash_added": shift.cash_added,
            "cash_removed": shift.cash_removed
        }
