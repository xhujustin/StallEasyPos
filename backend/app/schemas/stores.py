from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class StoreCreate(BaseModel):
    name: str

class StoreOut(BaseModel):
    id: int
    name: str
    owner_id: int
    user_role: Optional[str] = None  # 使用者在此店鋪的角色 (owner/manager/staff)
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
