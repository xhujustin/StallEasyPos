from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict
from app.models.order import OrderStatus, PaymentMethod, OrderSource

class OrderItemCreate(BaseModel):
    product_id: Optional[int]
    quantity: float
    note: Optional[str] = None
    # name/price snapshot handled by backend based on product_id

class OrderCreate(BaseModel):
    idempotency_key: str
    items: List[OrderItemCreate]
    total_amount: float # Client calculated total, backend should verify or re-calc
    payment_method: Optional[PaymentMethod] = None
    source: OrderSource = OrderSource.POS

class OrderItemOut(BaseModel):
    id: int
    product_id: Optional[int]
    name_snapshot: str
    price_snapshot: float
    quantity: float
    note: Optional[str]

    model_config = ConfigDict(from_attributes=True)

class OrderOut(BaseModel):
    id: int
    store_id: int
    order_no: int
    status: OrderStatus
    total_amount: float
    payment_method: Optional[PaymentMethod]
    source: OrderSource
    idempotency_key: str
    business_date: date
    created_at: datetime
    items: List[OrderItemOut] = []

    model_config = ConfigDict(from_attributes=True)
