from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import Token
from app.schemas.users import UserCreate
from app.schemas.common import ResponseBase

router = APIRouter()

@router.post("/login", response_model=ResponseBase[Token])
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    OAuth2 相容登入接口
    """
    user = await AuthService.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = await AuthService.create_tokens(user.id)
    return ResponseBase(data=token)

@router.post("/register", response_model=ResponseBase)
async def register(
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    註冊新使用者
    """
    user = await AuthService.register_user(db, user_in)
    return ResponseBase(message="User registered successfully", data={"id": user.id, "username": user.username})
