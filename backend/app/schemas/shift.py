from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.schemas.users import UserOut
from app.models.shift import ShiftStatus

class ShiftBase(BaseModel):
    initial_cash: float
    status: ShiftStatus

class ShiftCreate(BaseModel):
    initial_cash: float

class ShiftClose(BaseModel):
    final_cash: float

class CashOperation(BaseModel):
    amount: float
    type: str # 'in' or 'out'
    reason: Optional[str] = None

class ShiftTransactionOut(BaseModel):
    id: int
    user_id: int
    type: str
    amount: float
    reason: Optional[str] = None
    created_at: datetime
    user: UserOut

    class Config:
        from_attributes = True

class ShiftOut(ShiftBase):
    id: int
    shift_number: int
    store_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    final_cash: Optional[float] = None
    total_sales: float
    cash_sales: float
    total_net_profit: float
    order_count: int
    opened_by_id: int
    closed_by_id: Optional[int] = None
    
    cash_added: float
    cash_removed: float
    
    opened_by: UserOut
    closed_by: Optional[UserOut] = None
    transactions: List[ShiftTransactionOut] = []

    class Config:
        from_attributes = True
