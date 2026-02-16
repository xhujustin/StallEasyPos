import asyncio
from app.core.database import SessionLocal
from app.models.store import Store
from sqlalchemy import select

async def inspect_db():
    async with SessionLocal() as db:
        res = await db.execute(select(Store))
        stores = res.scalars().all()
        print("--- Current Stores in DB ---")
        for s in stores:
            print(f"ID: {s.id}, Name: {s.name}, Account: '{s.store_account}', OwnerID: {s.owner_id}")
        
if __name__ == "__main__":
    asyncio.run(inspect_db())
