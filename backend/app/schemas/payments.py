from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel, ConfigDict
from app.models.payment import PaymentMethod, PaymentStatus

class PaymentCreate(BaseModel):
    order_id: int
    amount: float
    method: PaymentMethod
    idempotency_key: str
    provider: Optional[str] = None
    provider_txn_id: Optional[str] = None
    raw_payload: Optional[Dict] = None

class PaymentOut(BaseModel):
    id: int
    store_id: int
    order_id: int
    method: PaymentMethod
    status: PaymentStatus
    amount: float
    idempotency_key: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
