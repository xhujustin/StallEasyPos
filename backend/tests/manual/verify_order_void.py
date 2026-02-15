import sys
import os
import asyncio
from datetime import datetime

# Hardcoded path for stability during manual testing
backend_path = r"c:\Users\YiFang\OneDrive\桌面\StallEasyPos\backend"
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from dotenv import load_dotenv
load_dotenv(os.path.join(backend_path, ".env"))

from app.core.database import SessionLocal as async_session
from app.services.order_service import OrderService
from app.schemas.orders import OrderCreate, OrderItemCreate
from app.models.order import OrderStatus, PaymentMethod, OrderSource
from app.models.product_material import ProductMaterial # Fix: Register ProductMaterial for SQLAlchemy relationship

async def verify_order_void():
    async with async_session() as db:
        print("Starting Order Void Verification...")
        
        # 1. Create a dummy order
        store_id = 1 # Assuming store 1 exists
        user_id = 1 # Assuming user 1 exists
        
        order_in = OrderCreate(
            idempotency_key=f"test_void_{datetime.now().timestamp()}",
            total_amount=180, # Updated to match product price (180) based on error message
            payment_method=PaymentMethod.CASH,
            source=OrderSource.POS,
            items=[
                OrderItemCreate(product_id=1, quantity=1, note="Test Item") 
            ]
        )
        
        try:
            print("Creating test order...")
            # Note: create_order might fail if product_id 1 doesn't exist.
            # We should wrap in try/except or ensure product exists.
            # For now, assuming product 1 exists as previous tests used it.
            order = await OrderService.create_order(db, store_id, order_in, user_id)
            print(f"Order created: #{order.order_no} (ID: {order.id}), Status: {order.status}")
            
            # 2. Try to void it (update status to CANCELLED)
            print("Attempting to void order...")
            updated_order = await OrderService.update_order_status(
                db, order.id, store_id, OrderStatus.CANCELLED
            )
            
            print(f"Order status updated to: {updated_order.status}")
            print(f"Is Voided: {updated_order.is_voided}")
            
            if updated_order.status == OrderStatus.CANCELLED and updated_order.is_voided:
                print("SUCCESS: Order voided successfully.")
            else:
                print("FAILURE: Order status mismatch.")

        except Exception as e:
            print(f"ERROR: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify_order_void())
