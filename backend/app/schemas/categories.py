from typing import List, Optional
from pydantic import BaseModel, ConfigDict

# Category Schemas
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    display_order: int = 0

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None

class CategoryOut(BaseModel):
    id: int
    store_id: int
    name: str
    description: Optional[str]
    display_order: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class CategoryReorder(BaseModel):
    category_ids: List[int]
