from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.user import User, StoreUser, UserRole
from app.core import security
from app.schemas.users import StoreUserCreate, StoreUserUpdate

class UserService:
    """
    人員管理服務: 處理使用者 CRUD、職務設定與 PIN 碼管理
    """

    @staticmethod
    async def get_store_users(db: AsyncSession, store_id: int) -> List[dict]:
        """取得該店鋪的所有人員 (含角色)"""
        query = (
            select(
                User, 
                StoreUser.role, 
                StoreUser.pin_hash
            )
            .join(StoreUser, User.id == StoreUser.user_id)
            .where(StoreUser.store_id == store_id)
        )
        result = await db.execute(query)
        
        users_out = []
        for user, role, pin_hash in result:
            users_out.append({
                "id": user.id,
                "username": user.username,
                "role": role,
                "is_admin": user.is_admin,
                "full_name": user.full_name,
                "nickname": user.nickname,
                "email": user.email,
                "phone": user.phone,
                "gender": user.gender,
                "address": user.address,
                "birthday": user.birthday,
                "has_pin": pin_hash is not None,
                "created_at": user.created_at
            })
        return users_out

    @staticmethod
    async def create_store_user(db: AsyncSession, store_id: int, user_in: StoreUserCreate) -> User:
        """為店鋪建立/關聯新人員"""
        # 1. 檢查使用者是否已存在 (全域)
        result = await db.execute(select(User).where(User.username == user_in.username))
        user = result.scalars().first()
        
        if not user:
            # 建立新使用者
            hashed_pw = security.get_password_hash(user_in.password) if user_in.password else None
            user = User(
                username=user_in.username,
                hashed_password=hashed_pw,
                is_admin=False,
                full_name=user_in.full_name,
                nickname=user_in.nickname,
                email=user_in.email,
                phone=user_in.phone,
                gender=user_in.gender,
                address=user_in.address,
                birthday=user_in.birthday
            )
            db.add(user)
            await db.flush()
        
        # 2. 檢查是否已關聯到該店鋪
        assoc_result = await db.execute(
            select(StoreUser).where(
                and_(StoreUser.store_id == store_id, StoreUser.user_id == user.id)
            )
        )
        if assoc_result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a member of this store"
            )
            
        # 3. 建立店鋪關聯
        pin_hash = None
        if user_in.pin:
            if not (6 <= len(user_in.pin) <= 8):
                 raise HTTPException(status_code=400, detail="PIN must be 6-8 digits")
            pin_hash = security.get_password_hash(user_in.pin)
            
        store_user = StoreUser(
            store_id=store_id,
            user_id=user.id,
            role=user_in.role,
            pin_hash=pin_hash
        )
        db.add(store_user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def update_store_user(db: AsyncSession, store_id: int, user_id: int, user_in: StoreUserUpdate) -> Optional[User]:
        """更新人員資訊 (角色、PIN碼)"""
        # 取得關聯紀錄
        assoc_result = await db.execute(
            select(StoreUser).where(
                and_(StoreUser.store_id == store_id, StoreUser.user_id == user_id)
            )
        )
        store_user = assoc_result.scalars().first()
        if not store_user:
            return None
            
        if user_in.role is not None:
            store_user.role = user_in.role
            
        if user_in.pin is not None:
            if user_in.pin == "": # 移除 PIN
                store_user.pin_hash = None
            else:
                if not (6 <= len(user_in.pin) <= 8):
                    raise HTTPException(status_code=400, detail="PIN must be 6-8 digits")
                store_user.pin_hash = security.get_password_hash(user_in.pin)
                
        # 更新 User 詳細資訊
        user = await db.get(User, user_id)
        if user:
            if user_in.full_name is not None: user.full_name = user_in.full_name
            if user_in.nickname is not None: user.nickname = user_in.nickname
            if user_in.email is not None: user.email = user_in.email
            if user_in.phone is not None: user.phone = user_in.phone
            if user_in.gender is not None: user.gender = user_in.gender
            if user_in.address is not None: user.address = user_in.address
            if user_in.birthday is not None: user.birthday = user_in.birthday

        await db.commit()
        
        # 返回使用者資訊
        user = await db.get(User, user_id)
        return user

    @staticmethod
    async def remove_from_store(db: AsyncSession, store_id: int, user_id: int):
        """將人員從店鋪中移除 (解除關聯)"""
        assoc_result = await db.execute(
            select(StoreUser).where(
                and_(StoreUser.store_id == store_id, StoreUser.user_id == user_id)
            )
        )
        store_user = assoc_result.scalars().first()
        if store_user:
            if store_user.role == UserRole.OWNER:
                 # 不准移除最後一個 Owner (邏輯需再加強)
                 pass
            await db.delete(store_user)
            await db.commit()
            return True
        return False
