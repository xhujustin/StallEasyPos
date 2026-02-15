import asyncio
import sys
import os
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Mock Env Vars for Testing
os.environ["SECRET_KEY"] = "test_secret_key"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:E3033e3033@localhost:5432/stalleasypos" # Adjust if needed

from app.core.database import SessionLocal
from app.services.order_service import OrderService
from app.schemas.orders import OrderCreate, OrderItemCreate, OrderStatus
from app.services.store_service import StoreService
from app.models.product_material import ProductMaterial # Fix for SQLAlchemy mapper
from unittest.mock import MagicMock

# Mock StoreService to avoid async session context issues in simple script
async def mock_get_store(db, store_id, user_id):
    return MagicMock(id=store_id)

StoreService.get_store_if_authorized = mock_get_store

async def verify_pos_orders():
    async with SessionLocal() as db:
        order_service = OrderService() # No args
        store_id = 1
        user_id = 1 # Mock user ID
        
        print("\n--- 1. Create a Test Order (POS Cash) ---")
        # Create a test order to verify it appears in the list
        import uuid
        order_in = OrderCreate(
            store_id=store_id,
            idempotency_key=str(uuid.uuid4()),
            items=[
                OrderItemCreate(
                    product_id=1,
                    quantity=1,
                    price_snapshot=180, # Match DB price
                    name_snapshot="Test Tea",
                    options=[]
                )
            ],
            total_amount=180, # Match DB price
            payment_method="cash",
            source="pos"
        )
        
        # Pass db and user_id to methods
        new_order = await order_service.create_order(db=db, store_id=store_id, order_in=order_in, user_id=user_id)
        print(f"Created Order: #{new_order.order_no} (ID: {new_order.id})")
        
        print(f"Created Order: #{new_order.order_no} (ID: {new_order.id})")
        
        # Verify Order Number Format (Simple Sequential + Daily Reset Logic Check implicitly)
        # Should be a small integer (e.g., < 100000) and not date-based
        if new_order.order_no < 1000000:
             print(f"[OK] Order Number format correct (Simple): {new_order.order_no}")
        else:
             print(f"[X] ERROR: Order Number format incorrect. Expected simple number, got {new_order.order_no}")

        print(f"Status: {new_order.status} (Should be PAID)")
        
        if new_order.status != OrderStatus.PAID:
            print("[X] ERROR: POS Cash order should be PAID automatically.")
        else:
            print("[OK] POS Order Status Correct.")

        print("\n--- 2. List Orders (Simulate POS 'Today's Bills') ---")
        # Simulate fetching orders for today
        today_str = datetime.now().strftime('%Y-%m-%d')
        orders = await order_service.get_store_orders(
            db=db,
            store_id=store_id,
            user_id=user_id,
            start_date=datetime.strptime(today_str, '%Y-%m-%d').date(),
            end_date=datetime.strptime(today_str, '%Y-%m-%d').date()
        )
        
        print(f"Found {len(orders)} orders for today.")
        found_new_order = next((o for o in orders if o.id == new_order.id), None)
        
        if found_new_order:
            print(f"[OK] Created order found in list: #{found_new_order.order_no}")
        else:
            print(f"[X] ERROR: Created order {new_order.order_no} not found in today's list!")

        print("\n--- 3. Void the Order ---")
        # Void the order
        updated_order = await order_service.update_order_status(db=db, order_id=new_order.id, store_id=store_id, status=OrderStatus.CANCELLED)
        print(f"Order Status after void: {updated_order.status}")
        print(f"Is Voided: {updated_order.is_voided}")
        
        if updated_order.status == OrderStatus.CANCELLED and updated_order.is_voided:
            print("[OK] Order voided successfully.")
        else:
            print("[X] ERROR: Order void failed.")

        print("\n--- 4. Verify Voided Status in List ---")
        # Re-fetch list to check status update
        orders_after = await order_service.get_store_orders(
            db=db,
            store_id=store_id,
            user_id=user_id,
            start_date=datetime.strptime(today_str, '%Y-%m-%d').date(),
            end_date=datetime.strptime(today_str, '%Y-%m-%d').date()
        )
        found_voided = next((o for o in orders_after if o.id == new_order.id), None)
        
        if found_voided and found_voided.status == OrderStatus.CANCELLED:
             print("[OK] Order status correctly reflected in list.")
        else:
             print("[X] ERROR: Voided status not updated in list.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(verify_pos_orders())
