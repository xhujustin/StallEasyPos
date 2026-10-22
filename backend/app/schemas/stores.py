from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class StoreCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)

class StoreUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)

class StoreOut(BaseModel):
    id: int
    name: str
    owner_id: int
    user_role: Optional[str] = None  # 使用者在此店鋪的角色 (owner/manager/staff)
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
