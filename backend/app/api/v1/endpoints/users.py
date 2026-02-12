from typing import Annotated, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.models.user import User
from app.services.auth_service import AuthService
# from app.schemas.users import UserOut # Assuming UserOut exists or we use User model directly (not recommended)
from app.schemas.common import ResponseBase

# Define UserOut locally if not exists in schemas/users.py
from pydantic import BaseModel, ConfigDict
from app.schemas.stores import StoreOut
from typing import List
from app.services.store_service import StoreService

class UserOut(BaseModel):
    id: int
    username: str
    stores: List[StoreOut] = []
    model_config = ConfigDict(from_attributes=True)

router = APIRouter()

@router.get("/me", response_model=ResponseBase[UserOut])
async def read_users_me(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)],
) -> Any:
    """
    取得當前登入使用者資訊 (包含關聯店鋪)
    """
    user = await db.get(User, current_user_id)
    if not user:
         # Should not happen if token is valid, but good practice
         return ResponseBase(data=None) # Or raise 404

    # Fetch stores
    stores = await StoreService.get_user_stores(db, current_user_id)
    
    # Construct response
    user_out = UserOut(
        id=user.id,
        username=user.username,
        stores=stores
    )
    
    return ResponseBase(data=user_out)
