from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, ConfigDict

# Material Schemas
class MaterialCreate(BaseModel):
    name: str
    unit: str  # g, ml, 個, 包
    stock_quantity: Decimal = Decimal("0")
    unit_cost: Decimal = Decimal("0")
    low_stock_threshold: Optional[Decimal] = Decimal("0")

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    stock_quantity: Optional[Decimal] = None
    unit_cost: Optional[Decimal] = None
    low_stock_threshold: Optional[Decimal] = None

class MaterialOut(BaseModel):
    id: int
    store_id: int
    name: str
    unit: str
    stock_quantity: Decimal
    unit_cost: Decimal
    low_stock_threshold: Optional[Decimal]
    
    model_config = ConfigDict(from_attributes=True)
