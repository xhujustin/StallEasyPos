from typing import Any, Optional, Dict
from pydantic import BaseModel
from app.models.system_setting import SettingScope

class SettingUpdate(BaseModel):
    key: str
    value: Any
    scope: SettingScope = SettingScope.STORE
    target_id: Optional[str] = None

class SettingBatchUpdate(BaseModel):
    scope: SettingScope = SettingScope.STORE
    target_id: Optional[str] = None
    settings: Dict[str, Any]

class SettingOut(BaseModel):
    key: str
    value: Any
    scope: SettingScope
    target_id: Optional[str] = None

    class Config:
        from_attributes = True
