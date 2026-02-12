import asyncio
import sys
import os

# Add current directory to sys.path to allow importing app
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.core.database import SessionLocal
from app.models.user import User, StoreUser
from app.models.store import Store

async def check():
    async with SessionLocal() as db:
        print("--- Users ---")
        users = (await db.execute(select(User))).scalars().all()
        for u in users:
            print(f"User: {u.id}, {u.username}")

        print("\n--- Stores ---")
        stores = (await db.execute(select(Store))).scalars().all()
        for s in stores:
            print(f"Store: {s.id}, {s.name}, owner_id: {s.owner_id}")
            
        print("\n--- StoreUsers ---")
        store_users = (await db.execute(select(StoreUser))).scalars().all()
        for su in store_users:
            print(f"StoreUser: store_id={su.store_id}, user_id={su.user_id}, role={su.role}")

if __name__ == "__main__":
    asyncio.run(check())
