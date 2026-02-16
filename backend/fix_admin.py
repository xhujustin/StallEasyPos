import asyncio
from app.core.database import SessionLocal
from app.models.user import User
from sqlalchemy import select, update

async def fix():
    async with SessionLocal() as db:
        # 1. 確保 admin 有全域管理員權限
        await db.execute(update(User).where(User.username == "admin").values(is_admin=True))
        await db.commit()
        print("Admin permissions updated successfully.")

if __name__ == "__main__":
    asyncio.run(fix())
