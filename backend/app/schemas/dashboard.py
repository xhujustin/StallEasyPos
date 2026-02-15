from typing import List, Optional
from pydantic import BaseModel
from datetime import date

class DailyMetric(BaseModel):
    date: date
    revenue: float
    net_profit: float
    gross_margin: float
    order_count: int

class TopProduct(BaseModel):
    id: int
    name: str
    quantity: int
    revenue: float

class DashboardStats(BaseModel):
    today_revenue: float
    today_orders: int
    avg_order_value: float
    revenue_growth: float # Percentage vs yesterday
    
    recent_sales: List[DailyMetric]
    top_products: List[TopProduct]
