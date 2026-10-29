from datetime import date, timedelta
from typing import List
from sqlalchemy import select, func, desc, case, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.schemas.dashboard import DashboardStats, DailyMetric, TopProduct
from app.services.store_service import StoreService
from app.services.store_clock import get_store_clock

class DashboardService:
    @staticmethod
    async def get_stats(
        db: AsyncSession,
        store_id: int,
        user_id: int,
        trend_days: int = 7,
        top_product_days: int = 30,
    ) -> DashboardStats:
        # Check permission
        await StoreService.get_store_if_authorized(db, store_id, user_id)
        
        _, today = await get_store_clock(db, store_id)
        yesterday = today - timedelta(days=1)
        seven_days_ago = today - timedelta(days=6)

        # 1. Calculate Today's Metrics
        # Define paid status list
        paid_statuses = [OrderStatus.PAID, OrderStatus.COMPLETED]
        
        today_stats_query = (
            select(
                func.coalesce(func.sum(Order.total_amount), 0).label("revenue"),
                func.count(Order.id).label("count")
            )
            .where(
                Order.store_id == store_id,
                Order.business_date == today,
                Order.status.in_(paid_statuses)
            )
        )
        today_res = await db.execute(today_stats_query)
        today_row = today_res.one()
        today_revenue = float(today_row.revenue)
        today_orders = int(today_row.count)
        
        avg_order_value = today_revenue / today_orders if today_orders > 0 else 0

        # 2. Calculate Yesterday's Revenue for Growth
        yesterday_stats_query = (
            select(func.coalesce(func.sum(Order.total_amount), 0))
            .where(
                Order.store_id == store_id,
                Order.business_date == yesterday,
                Order.status.in_(paid_statuses)
            )
        )
        yesterday_revenue = await db.execute(yesterday_stats_query)
        yesterday_revenue = float(yesterday_revenue.scalar() or 0)
        
        revenue_growth = 0
        if yesterday_revenue > 0:
            revenue_growth = ((today_revenue - yesterday_revenue) / yesterday_revenue) * 100
        elif today_revenue > 0:
            revenue_growth = 100 # 100% growth if yesterday was 0

        # 3. Recent Sales Trend - Revenue & Cost
        # Determine aggregation level based on request
        # If > 31 days, aggregate by month. Else by day.
        trend_days = trend_days if trend_days else 7
        start_date = today - timedelta(days=trend_days - 1)
        
        recent_sales = []
        
        if trend_days > 31:
            # Monthly Aggregation
            month_start_date = start_date.replace(day=1)
            month_expr = func.date_trunc('month', Order.business_date).cast(Date)
            
            # Revenue Query
            sales_query = (
                select(
                    month_expr.label("month_date"),
                    func.coalesce(func.sum(Order.total_amount), 0).label("revenue"),
                    func.count(Order.id).label("count")
                )
                .where(
                    Order.store_id == store_id,
                    Order.business_date >= month_start_date,
                    Order.status.in_(paid_statuses)
                )
                .group_by(month_expr)
                .order_by(month_expr)
            )
            
            # Cost Query (Join OrderItem)
            cost_query = (
                select(
                    month_expr.label("month_date"),
                    func.coalesce(func.sum(OrderItem.cost_snapshot * OrderItem.quantity), 0).label("cost")
                )
                .join(OrderItem, Order.id == OrderItem.order_id)
                .where(
                    Order.store_id == store_id,
                    Order.business_date >= month_start_date,
                    Order.status.in_(paid_statuses)
                )
                .group_by(month_expr)
            )
            
            sales_res = await db.execute(sales_query)
            sales_map = {row.month_date: row for row in sales_res.all()}
            
            cost_res = await db.execute(cost_query)
            cost_map = {row.month_date: row.cost for row in cost_res.all()}
            
            # Generate all months in range
            current_iter = month_start_date
            while current_iter <= today:
                key_date = current_iter
                revenue = 0
                order_count = 0
                cost = 0
                
                if key_date in sales_map:
                    row = sales_map[key_date]
                    revenue = float(row.revenue)
                    order_count = int(row.count)
                
                if key_date in cost_map:
                    cost = float(cost_map[key_date])
                    
                net_profit = revenue - cost
                # Avoid division by zero
                gross_margin = (net_profit / revenue * 100) if revenue > 0 else 0
                
                recent_sales.append(DailyMetric(
                    date=key_date,
                    revenue=revenue,
                    net_profit=net_profit,
                    gross_margin=gross_margin,
                    order_count=order_count
                ))
                
                # Move to next month
                next_month = current_iter.replace(day=28) + timedelta(days=4)
                current_iter = next_month.replace(day=1)
                
        else:
            # Daily Aggregation (Default)
            # Revenue Query
            sales_query = (
                select(
                    Order.business_date,
                    func.coalesce(func.sum(Order.total_amount), 0).label("revenue"),
                    func.count(Order.id).label("count")
                )
                .where(
                    Order.store_id == store_id,
                    Order.business_date >= start_date,
                    Order.status.in_(paid_statuses)
                )
                .group_by(Order.business_date)
                .order_by(Order.business_date)
            )
            
            # Cost Query
            cost_query = (
                select(
                    Order.business_date,
                    func.coalesce(func.sum(OrderItem.cost_snapshot * OrderItem.quantity), 0).label("cost")
                )
                .join(OrderItem, Order.id == OrderItem.order_id)
                .where(
                    Order.store_id == store_id,
                    Order.business_date >= start_date,
                    Order.status.in_(paid_statuses)
                )
                .group_by(Order.business_date)
            )

            sales_res = await db.execute(sales_query)
            sales_map = {row.business_date: row for row in sales_res.all()}
            
            cost_res = await db.execute(cost_query)
            cost_map = {row.business_date: row.cost for row in cost_res.all()}
            
            # Ensure we have all days even if 0 sales
            for i in range(trend_days):
                day = start_date + timedelta(days=i)
                revenue = 0
                order_count = 0
                cost = 0
                
                if day in sales_map:
                    row = sales_map[day]
                    revenue = float(row.revenue)
                    order_count = int(row.count)

                if day in cost_map:
                    cost = float(cost_map[day])

                net_profit = revenue - cost
                gross_margin = (net_profit / revenue * 100) if revenue > 0 else 0

                recent_sales.append(DailyMetric(
                    date=day, 
                    revenue=revenue, 
                    net_profit=net_profit,
                    gross_margin=gross_margin,
                    order_count=order_count
                ))

        # 4. Top Products for the selected inclusive date range.
        top_products_start_date = today - timedelta(days=top_product_days - 1)
        top_products_query = (
            select(
                Product.id,
                Product.name,
                func.sum(OrderItem.quantity).label("quantity"),
                func.sum(OrderItem.price_snapshot * OrderItem.quantity).label("revenue")
            )
            .join(OrderItem, Product.id == OrderItem.product_id)
            .join(Order, OrderItem.order_id == Order.id)
            .where(
                Order.store_id == store_id,
                Order.business_date >= top_products_start_date,
                Order.status.in_(paid_statuses)
            )
            .group_by(Product.id, Product.name)
            .order_by(desc("quantity"))
            .limit(5)
        )
        
        products_res = await db.execute(top_products_query)
        top_products = [
            TopProduct(
                id=row.id,
                name=row.name,
                quantity=int(row.quantity),
                revenue=float(row.revenue)
            )
            for row in products_res.all()
        ]

        return DashboardStats(
            today_revenue=today_revenue,
            today_orders=today_orders,
            avg_order_value=avg_order_value,
            revenue_growth=revenue_growth,
            recent_sales=recent_sales,
            top_products=top_products
        )
