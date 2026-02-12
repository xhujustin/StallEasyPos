from datetime import date
from pydantic import BaseModel, ConfigDict

class ClosingCreate(BaseModel):
    actual_cash: float

class ClosingOut(BaseModel):
    id: int
    business_date: date
    expected_cash: float
    actual_cash: float
    short_over: float
    
    model_config = ConfigDict(from_attributes=True)
