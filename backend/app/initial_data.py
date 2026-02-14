import asyncio
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import SessionLocal, engine
from app.models.user import User, StoreUser, UserRole
from app.models.store import Store
from app.schemas.stores import StoreCreate
from app.services.store_service import StoreService
from app.core.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_db(db: AsyncSession) -> None:
    # 1. Create Admin User (Owner)
    result = await db.execute(select(User).where(User.username == "admin"))
    admin = result.scalars().first()
    
    if not admin:
        logger.info("Creating user: admin")
        admin_in = User(
            username="admin",
            hashed_password=get_password_hash("password"),
        )
        db.add(admin_in)
        await db.flush()
        admin = admin_in
    else:
        logger.info("User admin already exists")

    # 2. Create Staff User
    result = await db.execute(select(User).where(User.username == "staff"))
    staff = result.scalars().first()
    
    if not staff:
        logger.info("Creating user: staff")
        staff_in = User(
            username="staff",
            hashed_password=get_password_hash("password"),
        )
        db.add(staff_in)
        await db.flush()
        staff = staff_in
    else:
        logger.info("User staff already exists")



    # 3. Create Default Store
    result = await db.execute(select(Store).where(Store.name == "StallEasy Main Store"))
    store = result.scalars().first()

    if not store:
        logger.info("Creating default store")
        if admin:
             store = await StoreService.create_store(
                db, 
                StoreCreate(name="StallEasy Main Store"),
                owner_id=admin.id
            )
             logger.info(f"Created store: {store.name} (ID: {store.id})")
    else:
        logger.info("Default store already exists")

    # 4. Ensure Relationships (Idempotent Check)
    if store and staff:
        # Check if staff is already linked
        result = await db.execute(select(StoreUser).where(
            StoreUser.store_id == store.id,
            StoreUser.user_id == staff.id
        ))
        existing_link = result.scalars().first()
        
        if not existing_link:
             store_user = StoreUser(store_id=store.id, user_id=staff.id, role=UserRole.STAFF)
             db.add(store_user)
             logger.info("Added staff to store (Repair)")
        else:
             logger.info("Staff already linked to store")

    if store and admin:
        # Check if admin is already linked (should be owner)
        result = await db.execute(select(StoreUser).where(
             StoreUser.store_id == store.id,
             StoreUser.user_id == admin.id
        ))
        existing_link = result.scalars().first()
        
        if not existing_link:
             store_user = StoreUser(store_id=store.id, user_id=admin.id, role=UserRole.OWNER)
             db.add(store_user)
             logger.info("Added admin to store (Repair)")
        else:
             logger.info("Admin already linked to store")

    await db.commit()

async def main() -> None:
    logger.info("Creating initial data")
    async with SessionLocal() as session:
        await init_db(session)
    logger.info("Initial data created")

if __name__ == "__main__":
    asyncio.run(main())
