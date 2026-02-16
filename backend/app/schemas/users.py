from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.user import UserRole
from typing import Optional, List
from app.schemas.stores import StoreOut

class UserCreate(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    is_admin: bool
    full_name: Optional[str] = None
    nickname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    birthday: Optional[datetime] = None
    created_at: datetime
    stores: List[StoreOut] = []
    model_config = ConfigDict(from_attributes=True)

class StoreUserCreate(BaseModel):
    username: str
    password: Optional[str] = None
    role: UserRole = UserRole.STAFF
    pin: Optional[str] = None # 6-8 digits
    
    # 詳細資訊
    full_name: Optional[str] = None
    nickname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    birthday: Optional[datetime] = None

class StoreUserUpdate(BaseModel):
    username: Optional[str] = None # Added for renaming
    role: Optional[UserRole] = None
    pin: Optional[str] = None # 6-8 digits, empty string to remove
    
    # 詳細資訊
    full_name: Optional[str] = None
    nickname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    birthday: Optional[datetime] = None

class StoreUserOut(BaseModel):
    id: int
    username: str
    role: UserRole
    is_admin: bool
    full_name: Optional[str] = None
    nickname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    birthday: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

