from datetime import timedelta
from typing import Optional
from sqlalchemy import select, and_
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
    async def authenticate_user(db: AsyncSession, username: str, pin: str) -> tuple[Optional[User], str]:
        """
        統一驗證入口：
        1. 優先檢查是否為「店鋪帳號 (Store Account)」
        2. 若否，則檢查是否為「使用者個人帳號 (User Username)」
        回傳: (User, auth_mode) -> auth_mode 可為 'STAFF' 或 'ADMIN'
        """
        from app.models.store import Store
        from app.models.user import StoreUser
        
        # --- 軌道 1: 店鋪帳號分流 ---
        store_result = await db.execute(select(Store).where(Store.store_account == username))
        store = store_result.scalars().first()
        
        if store:
            # 優先驗證與該店舖關聯的所有使用者 (包含員工與 Owner)
            verify_query = (
                select(User, StoreUser)
                .join(StoreUser, User.id == StoreUser.user_id)
                .where(and_(
                    StoreUser.store_id == store.id,
                    StoreUser.pin_hash.isnot(None)
                ))
            )
            verify_result = await db.execute(verify_query)
            from app.models.user import UserRole
            for staff_user, sa in verify_result.all():
                if security.verify_password(pin, sa.pin_hash):
                    # 判斷登入權限模式：如果是管理員或是該店鋪 Owner 則為 ADMIN
                    mode = "ADMIN" if (staff_user.is_admin or sa.role == UserRole.OWNER) else "STAFF"
                    return staff_user, mode
            
            # [硬性阻斷] 既然已經確定輸入的是「店鋪代表帳號」，
            # 驗證邏輯就必須鎖定在此店鋪範圍。
            # 如果 PIN 碼都對不上，必須直接回傳 None 並報錯。
            # 絕對禁止跳出此區塊進入下方的個人密碼驗證軌道。
            return None, "STAFF"
            
        # --- 軌道 2: 個人帳號分流 (管理後台登入模式) ---
        result = await db.execute(select(User).where(User.username == username))
        target_user = result.scalars().first()
        
        if target_user:
            # 方案 A: 驗證該使用者在本系統中登記的任何個人 PIN (優先權高)
            assoc_result = await db.execute(select(StoreUser).where(StoreUser.user_id == target_user.id))
            store_users = assoc_result.scalars().all()
            
            for su in store_users:
                if su.pin_hash and security.verify_password(pin, su.pin_hash):
                    return target_user, "ADMIN"
            
            # 方案 B: 驗證使用者本人的「管理密碼」 (Fallback / 管理員進入後台使用)
            if target_user.hashed_password and security.verify_password(pin, target_user.hashed_password):
                return target_user, "ADMIN"
                
        return None, "NONE"

    @staticmethod
    async def create_tokens(user_id: int, auth_mode: str = "ADMIN") -> Token:
        """建立 Access & Refresh Token"""
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            data={"sub": str(user_id), "mode": auth_mode}, 
            expires_delta=access_token_expires
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
