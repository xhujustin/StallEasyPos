from typing import Annotated, Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.config import settings
from app.core.security import verify_password
# from app.models.user import User # Circular import prevention, import inside function if needed

# 定義 OAuth2 Scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

# 資料庫依賴 (Annotated for easier usage)
SessionDep = Annotated[AsyncSession, Depends(get_db)]
TokenDep = Annotated[str, Depends(oauth2_scheme)]

async def get_current_user_id(token: TokenDep) -> int:
    """
    從 Token 解析當前使用者 ID
    (尚未實作完整的 User Model 查詢)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return int(user_id)
    except (JWTError, ValueError):
        raise credentials_exception
from app.models.user import User

async def get_current_user(
    db: SessionDep, 
    user_id: Annotated[int, Depends(get_current_user_id)]
) -> User:
    """取得當前登入的使用者物件"""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

async def get_current_admin(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """驗證是否為全域管理員"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges"
        )
    return current_user
