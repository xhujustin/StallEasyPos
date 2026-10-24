from datetime import datetime, date
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_setting import SettingScope
from app.services.setting_service import SettingService


async def get_store_clock(db: AsyncSession, store_id: int) -> tuple[str, date]:
    timezone_name = await SettingService.get_setting(db, store_id, "timezone", SettingScope.STORE) or "Asia/Taipei"
    try:
        business_date = datetime.now(ZoneInfo(str(timezone_name))).date()
    except ZoneInfoNotFoundError:
        timezone_name = "Asia/Taipei"
        business_date = datetime.now(ZoneInfo(timezone_name)).date()
    return str(timezone_name), business_date
