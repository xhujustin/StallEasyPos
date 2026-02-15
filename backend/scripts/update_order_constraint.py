import asyncio
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Database URL
DATABASE_URL = "postgresql+asyncpg://postgres:E3033e3033@localhost:5432/stalleasypos"

async def update_constraints():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        print("--- Updating Order Table Constraints ---")
        
        # 1. Drop old constraint
        try:
            print("Dropping old constraint: uq_orders_store_orderno")
            await conn.execute(text("ALTER TABLE orders DROP CONSTRAINT IF EXISTS uq_orders_store_orderno"))
        except Exception as e:
            print(f"Warning dropping old constraint: {e}")

        # 2. Add new constraint
        try:
            print("Adding new constraint: uq_orders_store_date_orderno")
            # Ensure business_date is NOT NULL before adding (it should be)
            await conn.execute(text("""
                ALTER TABLE orders 
                ADD CONSTRAINT uq_orders_store_date_orderno 
                UNIQUE (store_id, business_date, order_no)
            """))
            print("SUCCESS: Constraint updated.")
        except Exception as e:
            print(f"Error adding new constraint: {e}")
            print("If error is 'relation already exists', it might be already applied.")

    await engine.dispose()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(update_constraints())
