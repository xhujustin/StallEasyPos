from typing import Any, Optional, Dict
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.system_setting import SystemSetting, SettingScope

class SettingService:
    @staticmethod
    async def get_setting(
        db: AsyncSession, 
        store_id: int, 
        key: str, 
        scope: SettingScope = SettingScope.STORE, 
        target_id: Optional[str] = None
    ) -> Optional[Any]:
        """
        取得特定範圍的設定值
        """
        query = select(SystemSetting.value).where(
            and_(
                SystemSetting.store_id == store_id,
                SystemSetting.scope == scope,
                SystemSetting.key == key,
                SystemSetting.target_id == target_id if target_id else SystemSetting.target_id.is_(None)
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_setting(
        db: AsyncSession,
        store_id: int,
        key: str,
        value: Any,
        scope: SettingScope = SettingScope.STORE,
        target_id: Optional[str] = None
    ) -> SystemSetting:
        """
        更新或建立設定值
        """
        query = select(SystemSetting).where(
            and_(
                SystemSetting.store_id == store_id,
                SystemSetting.scope == scope,
                SystemSetting.key == key,
                SystemSetting.target_id == target_id if target_id else SystemSetting.target_id.is_(None)
            )
        )
        result = await db.execute(query)
        setting = result.scalar_one_or_none()

        if setting:
            setting.value = value
        else:
            setting = SystemSetting(
                store_id=store_id,
                scope=scope,
                target_id=target_id,
                key=key,
                value=value
            )
            db.add(setting)
        
        # 由批次端點統一提交，避免其中一筆失敗時產生部分更新。
        await db.flush()
        return setting

    @staticmethod
    async def get_settings_by_scope(
        db: AsyncSession,
        store_id: int,
        scope: SettingScope,
        target_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        批次取得特定範圍的所有設定
        """
        query = select(SystemSetting.key, SystemSetting.value).where(
            and_(
                SystemSetting.store_id == store_id,
                SystemSetting.scope == scope,
                SystemSetting.target_id == target_id if target_id else SystemSetting.target_id.is_(None)
            )
        )
        result = await db.execute(query)
        return {row[0]: row[1] for row in result.all()}
