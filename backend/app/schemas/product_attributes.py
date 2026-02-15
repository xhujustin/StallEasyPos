from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, ConfigDict

# OptionMaterial Schemas
class OptionMaterialCreate(BaseModel):
    material_id: int
    quantity: Decimal

class OptionMaterialOut(BaseModel):
    id: int
    option_id: int
    material_id: int
    quantity: Decimal
    
    model_config = ConfigDict(from_attributes=True)

# ProductAttributeOption Schemas
class ProductAttributeOptionCreate(BaseModel):
    name: str
    price_adjustment: Decimal = Decimal("0")
    is_active: bool = True
    display_order: int = 0
    materials: List[OptionMaterialCreate] = []

class ProductAttributeOptionUpdate(BaseModel):
    name: Optional[str] = None
    price_adjustment: Optional[Decimal] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None

class ProductAttributeOptionOut(BaseModel):
    id: int
    attribute_id: int
    name: str
    price_adjustment: Decimal
    is_active: bool
    display_order: int
    materials: List[OptionMaterialOut] = []
    
    model_config = ConfigDict(from_attributes=True)

# ProductAttribute Schemas
class ProductAttributeCreate(BaseModel):
    name: str
    min_selection: int = 0
    max_selection: int = 1
    display_order: int = 0
    options: List[ProductAttributeOptionCreate] = []

class ProductAttributeUpdate(BaseModel):
    name: Optional[str] = None
    min_selection: Optional[int] = None
    max_selection: Optional[int] = None
    display_order: Optional[int] = None
    options: Optional[List[ProductAttributeOptionCreate]] = []

class ProductAttributeOut(BaseModel):
    id: int
    product_id: int
    name: str
    min_selection: int
    max_selection: int
    display_order: int
    options: List[ProductAttributeOptionOut] = []
    
    model_config = ConfigDict(from_attributes=True)
