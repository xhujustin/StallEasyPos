import asyncio
from app.core.database import SessionLocal
from app.models.user import User
from sqlalchemy import select

async def inspect_users():
    async with SessionLocal() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        print("--- Current Users in DB ---")
        for u in users:
            print(f"ID: {u.id}, Username: '{u.username}', IsAdmin: {u.is_admin}")
        
if __name__ == "__main__":
    asyncio.run(inspect_users())
