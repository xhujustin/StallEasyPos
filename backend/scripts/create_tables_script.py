import sys
import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

# Add backend directory to path
sys.path.append(os.getcwd())

from app.core.config import settings
from app.models.base import Base
# Make sure to import the model so it gets registered with Base.metadata
from app.models.product_material import ProductMaterial
from app.models.product import Product 
from app.models.material import Material

async def create_tables():
    print(f"Connecting to database: {settings.DATABASE_URL}")
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        print("Creating tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("Tables created successfully!")
    await engine.dispose()

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(create_tables())
