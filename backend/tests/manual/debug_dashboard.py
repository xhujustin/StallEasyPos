import asyncio
import sys
import os
from datetime import date
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Mock Env Vars for Testing
os.environ["SECRET_KEY"] = "test_secret_key"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:E3033e3033@localhost:5432/stalleasypos"
DATABASE_URL = os.environ["DATABASE_URL"]

from app.services.dashboard_service import DashboardService
from app.core.config import settings
# Import models to ensure relationships are set up
from app.models.product import Product
from app.models.product_attribute import ProductAttribute
from app.models.order import Order, OrderItem
from app.models.store import Store
from app.models.user import User

async def debug_dashboard():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        print(f"--- Debugging Database Content ---")
        from sqlalchemy import text
        
        # Check Stores
        res_stores = await db.execute(text("SELECT id, name FROM stores"))
        stores = res_stores.fetchall()
        print(f"Stores: {stores}")

        # Check Orders Today
        today = date.today()
        print(f"Checking orders for {today}")
        
        res_orders = await db.execute(text(f"SELECT id, store_id, order_no, status, total_amount, business_date FROM orders WHERE business_date = '{today}'"))
        orders = res_orders.fetchall()
        
        if not orders:
             print("No orders found for today in ANY store.")
        
        for o in orders:
             print(f"Order #{o.order_no} | Store: {o.store_id} | Status: {o.status} | Amount: {o.total_amount}")

        # Check Specific Store 1 Stats again
        store_id = 1
        # ... existing logic if needed, but the above is more useful
        
        try:
            stats = await DashboardService.get_stats(db, store_id, 1)
            print(f"\n--- API Stats for Store {store_id} ---")
            print(f"Revenue: {stats.today_revenue}, Count: {stats.today_orders}")
        except Exception as e:
            print(f"API Error: {e}")

    await engine.dispose()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(debug_dashboard())
