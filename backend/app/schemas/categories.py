from typing import Optional
from pydantic import BaseModel, ConfigDict

# Category Schemas
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class CategoryOut(BaseModel):
    id: int
    store_id: int
    name: str
    description: Optional[str]
    
    model_config = ConfigDict(from_attributes=True)
