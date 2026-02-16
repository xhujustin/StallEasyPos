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
    async def authenticate_user(db: AsyncSession, username: str, pin: str) -> Optional[User]:
        """
        統一驗證入口：帳號 + PIN 碼
        """
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalars().first()
        if not user:
            return None

        # 1. 如果是全域管理員且 user 表上有 hashed_password (此時作為密碼或 PIN 存放)
        # 為了轉型，我們優先檢查 StoreUser 中的 PIN
        from app.models.user import StoreUser
        assoc_result = await db.execute(select(StoreUser).where(StoreUser.user_id == user.id))
        store_users = assoc_result.scalars().all()
        
        for su in store_users:
            if su.pin_hash and security.verify_password(pin, su.pin_hash):
                return user
        
        # 2. 備位方案：支援舊有的 User.hashed_password 作為 PIN 驗證 (例如 Admin 初次設定時)
        if user.hashed_password and security.verify_password(pin, user.hashed_password):
            return user
                
        return None

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
