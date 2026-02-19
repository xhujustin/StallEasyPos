from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict
from app.models.order import OrderStatus, PaymentMethod, OrderSource, OrderType
from app.schemas.users import UserOut

class OrderItemOption(BaseModel):
    attribute_id: int
    attribute_name: str
    option_id: int
    option_name: str
    price_adjustment: float

class OrderItemCreate(BaseModel):
    product_id: Optional[int]
    quantity: float
    note: Optional[str] = None
    options: Optional[List[OrderItemOption]] = None
    # name/price snapshot handled by backend based on product_id

class OrderCreate(BaseModel):
    idempotency_key: str
    items: List[OrderItemCreate]
    total_amount: float # Client calculated total, backend should verify or re-calc
    subtotal: float = 0
    service_fee: float = 0
    service_fee_rate: float = 0
    order_type: OrderType = OrderType.TAKE_OUT
    payment_method: Optional[PaymentMethod] = None
    source: OrderSource = OrderSource.POS
    cash_received: Optional[float] = None
    change_amount: Optional[float] = None
    discount_amount: float = 0
    discount_note: Optional[str] = None

class OrderItemOut(BaseModel):
    id: int
    product_id: Optional[int]
    name_snapshot: str
    price_snapshot: float
    quantity: float
    note: Optional[str]
    options: Optional[List[dict]] = None

    model_config = ConfigDict(from_attributes=True)

class OrderOut(BaseModel):
    id: int
    order_no: int
    status: OrderStatus
    order_type: OrderType
    subtotal: float
    service_fee: float
    service_fee_rate: float
    total_amount: float
    payment_method: Optional[PaymentMethod]
    source: OrderSource
    idempotency_key: str
    business_date: date
    created_at: datetime
    
    cash_received: Optional[float] = None
    change_amount: Optional[float] = None
    discount_amount: float = 0
    discount_note: Optional[str] = None
    
    created_by: Optional[UserOut] = None
    creator_role: Optional[str] = None # Computed

    items: List[OrderItemOut] = []

    model_config = ConfigDict(from_attributes=True)
