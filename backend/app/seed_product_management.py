"""
商品管理測試資料腳本
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import async_session_maker
from app.services.category_service import CategoryService
from app.services.material_service import MaterialService
from app.schemas.categories import CategoryCreate
from app.schemas.materials import MaterialCreate
from decimal import Decimal

async def seed_product_management_data():
    """建立商品管理測試資料"""
    async with async_session_maker() as db:
        store_id = 1  # 台北店
        
        print("=== 建立分類 ===")
        categories_data = [
            {"name": "飲料", "description": "各式飲品"},
            {"name": "小吃", "description": "炸物、點心"},
            {"name": "主食", "description": "飯類、麵類"},
        ]
        
        for cat_data in categories_data:
            try:
                category = await CategoryService.create_category(
                    db, store_id, CategoryCreate(**cat_data)
                )
                print(f"✓ 建立分類: {category.name} (ID: {category.id})")
            except Exception as e:
                print(f"✗ 分類 {cat_data['name']} 可能已存在: {e}")
        
        print("\n=== 建立耗材 ===")
        materials_data = [
            {"name": "茶葉", "unit": "g", "stock_quantity": Decimal("5000"), "unit_cost": Decimal("0.1"), "low_stock_threshold": Decimal("500")},
            {"name": "珍珠", "unit": "g", "stock_quantity": Decimal("2000"), "unit_cost": Decimal("0.15"), "low_stock_threshold": Decimal("200")},
            {"name": "杯子(大)", "unit": "個", "stock_quantity": Decimal("500"), "unit_cost": Decimal("2"), "low_stock_threshold": Decimal("50")},
            {"name": "杯子(中)", "unit": "個", "stock_quantity": Decimal("500"), "unit_cost": Decimal("1.5"), "low_stock_threshold": Decimal("50")},
            {"name": "杯子(小)", "unit": "個", "stock_quantity": Decimal("500"), "unit_cost": Decimal("1"), "low_stock_threshold": Decimal("50")},
            {"name": "冰塊", "unit": "g", "stock_quantity": Decimal("10000"), "unit_cost": Decimal("0.01"), "low_stock_threshold": Decimal("1000")},
            {"name": "糖", "unit": "g", "stock_quantity": Decimal("3000"), "unit_cost": Decimal("0.05"), "low_stock_threshold": Decimal("300")},
            {"name": "雞排", "unit": "片", "stock_quantity": Decimal("100"), "unit_cost": Decimal("25"), "low_stock_threshold": Decimal("10")},
            {"name": "薯條", "unit": "份", "stock_quantity": Decimal("80"), "unit_cost": Decimal("15"), "low_stock_threshold": Decimal("10")},
        ]
        
        for mat_data in materials_data:
            try:
                material = await MaterialService.create_material(
                    db, store_id, MaterialCreate(**mat_data)
                )
                print(f"✓ 建立耗材: {material.name} (庫存: {material.stock_quantity}{material.unit})")
            except Exception as e:
                print(f"✗ 耗材 {mat_data['name']} 可能已存在: {e}")
        
        print("\n=== 測試資料建立完成 ===")

if __name__ == "__main__":
    asyncio.run(seed_product_management_data())
