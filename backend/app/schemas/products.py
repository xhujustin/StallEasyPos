from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict
from app.schemas.materials import MaterialOut
from app.schemas.product_attributes import ProductAttributeCreate, ProductAttributeOut, ProductAttributeUpdate

class ProductMaterialCreate(BaseModel):
    material_id: int
    quantity: float

class ProductMaterialOut(BaseModel):
    id: int
    material_id: int
    quantity: float
    material: Optional[MaterialOut] = None
    
    model_config = ConfigDict(from_attributes=True)

class ProductCreate(BaseModel):
    name: str
    price: float
    cost: Optional[float] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    attributes: Optional[List[ProductAttributeCreate]] = None
    materials: Optional[List[ProductMaterialCreate]] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    cost: Optional[float] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    image_url: Optional[str] = None
    attributes: Optional[List[ProductAttributeUpdate]] = None
    materials: Optional[List[ProductMaterialCreate]] = None

class ProductOut(BaseModel):
    id: int
    store_id: int
    name: str
    price: float
    cost: Optional[float]
    category: Optional[str]
    is_active: bool
    attributes: List[ProductAttributeOut] = []
    image_url: Optional[str]
    materials: List[ProductMaterialOut] = []
    
    model_config = ConfigDict(from_attributes=True)
