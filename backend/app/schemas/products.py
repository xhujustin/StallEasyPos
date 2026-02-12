from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class ProductCreate(BaseModel):
    name: str
    price: float
    cost: Optional[float] = None
    category: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    cost: Optional[float] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    attributes: Optional[Dict[str, Any]] = None

class ProductOut(BaseModel):
    id: int
    store_id: int
    name: str
    price: float
    cost: Optional[float]
    category: Optional[str]
    is_active: bool
    attributes: Optional[Dict[str, Any]]
    
    model_config = ConfigDict(from_attributes=True)
