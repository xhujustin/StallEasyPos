
import asyncio
import sys
import os

# Ensure backend directory is in path
sys.path.append(os.path.join(os.getcwd(), '../../..', 'backend')) # Adjust for nested test folder

# Set environment variables for testing
os.environ["SECRET_KEY"] = "0860f80553d7782e2178cc4785ed780621aab2b9de026db3851e1842c4d8b5c5"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:E3033e3033@localhost:5432/stalleasypos"

# Try to load .env if exists (for other settings)
try:
    from dotenv import load_dotenv
    load_dotenv("../../../backend/.env")
except ImportError:
    pass

from sqlalchemy import select
from app.core.database import SessionLocal
from app.services.order_service import OrderService
from app.services.material_service import MaterialService
from app.schemas.orders import OrderCreate, OrderItemCreate, OrderItemOption
from app.schemas.materials import MaterialCreate
from app.models.product_attribute import ProductAttribute, ProductAttributeOption, OptionMaterial
from app.models.product import Product
from app.models.product_material import ProductMaterial # Fix: Import this to resolve relationship logic

async def verify_inventory_deduction():
    async with SessionLocal() as db:
        print("--- 開始驗證選項庫存扣除 ---")

        # 1. 準備測試資料
        store_id = 1
        user_id = 1 # Admin
        
        # Random suffix to avoid unique constraint violations
        import random
        suffix = str(random.randint(1000, 9999))

        # 1.1 建立測試耗材 "珍珠"
        material = await MaterialService.create_material(db, store_id, MaterialCreate(
            name=f"測試珍珠_{suffix}", unit="g", stock_quantity=1000, unit_cost=0.1
        ))
        print(f"建立耗材: {material.name}, 初始庫存: {material.stock_quantity}")

        # 1.2 建立測試商品 "珍珠奶茶"
        product = Product(name=f"測試珍奶_{suffix}", price=50, store_id=store_id)
        db.add(product)
        await db.flush()
        print(f"建立商品: {product.name}")

        # 1.3 建立屬性 "加料" 與選項 "加珍珠"
        attr = ProductAttribute(product_id=product.id, name="加料")
        db.add(attr)
        await db.flush()

        option = ProductAttributeOption(attribute_id=attr.id, name=f"加珍珠_{suffix}", price_adjustment=10)
        db.add(option)
        await db.flush()
        print(f"建立選項: {option.name}")

        # 1.4 連結耗材: 加珍珠 -> 消耗 50g 珍珠
        opt_mat = OptionMaterial(option_id=option.id, material_id=material.id, quantity=50)
        db.add(opt_mat)
        await db.flush()
        await db.commit() # Commit setup data
        print(f"連結耗材: {option.name} -> 消耗 {opt_mat.quantity}{material.unit} {material.name}")

        # 2. 建立訂單
        print("\n--- 建立訂單 ---")
        order_in = OrderCreate(
            idempotency_key="test-deduction-" + str(os.urandom(4).hex()),
            total_amount=120, # (50+10) * 2
            items=[
                OrderItemCreate(
                    product_id=product.id,
                    quantity=2, # 2 杯
                    options=[
                        OrderItemOption(
                            attribute_id=attr.id, attribute_name=attr.name,
                            option_id=option.id, option_name=option.name,
                            price_adjustment=10
                        )
                    ]
                )
            ]
        )

        try:
            order = await OrderService.create_order(db, store_id, order_in, user_id)
            print(f"訂單建立成功: ID {order.id}, 總金額 {order.total_amount}")
        except Exception as e:
            print(f"訂單建立失敗: {e}")
            return

        # 3. 驗證庫存
        print("\n--- 驗證庫存 ---")
        updated_material = await MaterialService.get_material(db, material.id, store_id)
        expected_stock = 1000 - (50 * 2) # Initial - (deduct * qty) = 900
        
        print(f"耗材: {updated_material.name}")
        print(f"預期庫存: {expected_stock}")
        print(f"實際庫存: {updated_material.stock_quantity}")

        if updated_material.stock_quantity == expected_stock:
            print("\n[OK] 驗證成功！庫存扣除正確。")
        else:
            print("\n[FAIL] 驗證失敗！庫存扣除不正確。")

        # Cleanup (Optional, but good for repetitive tests)
        # await MaterialService.delete_material(db, material.id, store_id)
        # db.delete(product) ...

if __name__ == "__main__":
    asyncio.run(verify_inventory_deduction())
