
import asyncio
from sqlalchemy import text
from app.core.database import SessionLocal

async def update_material_columns():
    async with SessionLocal() as session:
        print("開始更新 materials 表欄位精度...")
        
        # 更新 unit_cost 欄位
        print("更新 unit_cost 欄位為 Numeric(10, 4)...")
        await session.execute(text("ALTER TABLE materials ALTER COLUMN unit_cost TYPE NUMERIC(10, 4)"))
        
        # 更新 stock_quantity 欄位 (為了保持一致性與支援微量消耗)
        print("更新 stock_quantity 欄位為 Numeric(10, 4)...")
        await session.execute(text("ALTER TABLE materials ALTER COLUMN stock_quantity TYPE NUMERIC(10, 4)"))
        
        await session.commit()
        print("更新完成!")

if __name__ == "__main__":
    asyncio.run(update_material_columns())
