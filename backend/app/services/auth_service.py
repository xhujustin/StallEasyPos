from datetime import timedelta
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import Token
from app.schemas.users import UserCreate

class AuthService:
    """
    認證服務: 處理登入、註冊、Token 簽發
    """
    
    @staticmethod
    async def authenticate_user(db: AsyncSession, username: str, password: str) -> Optional[User]:
        """驗證使用者帳號密碼"""
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalars().first()
        if not user:
            return None
        if not security.verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    async def create_tokens(user_id: int) -> Token:
        """建立 Access & Refresh Token"""
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            data={"sub": str(user_id)}, expires_delta=access_token_expires
        )
        # Refresh token logic can be added here
        return Token(access_token=access_token, token_type="bearer")

    @staticmethod
    async def register_user(db: AsyncSession, user_in: UserCreate) -> User:
        """註冊新使用者 (不含 Store 關聯)"""
        # 檢查是否已存在
        result = await db.execute(select(User).where(User.username == user_in.username))
        if result.scalars().first():
            raise HTTPException(
                status_code=400,
                detail="Username already registered"
            )
        
        db_user = User(
            username=user_in.username,
            hashed_password=security.get_password_hash(user_in.password),
            # default other fields
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user
