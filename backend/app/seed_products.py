import asyncio
import logging

from sqlalchemy import text
from app.core.database import SessionLocal
from app.models.product import Product
from app.models.store import Store

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MOCK_PRODUCTS = [
    {"name": "經典原味嫩煎鴨胸", "price": 180, "category": "主餐", "store_id": 1, "is_active": True},
    {"name": "香煎櫻桃鴨胸", "price": 220, "category": "主餐", "store_id": 1, "is_active": True},
    {"name": "羅勒青醬鴨肉麵", "price": 160, "category": "主食", "store_id": 1, "is_active": True},
    {"name": "蒜香奶油義大利麵", "price": 140, "category": "主食", "store_id": 1, "is_active": True},
    {"name": "每日例湯", "price": 60, "category": "附餐", "store_id": 1, "is_active": True},
    {"name": "季節時蔬", "price": 80, "category": "附餐", "store_id": 1, "is_active": True},
    {"name": "脆皮薯條", "price": 90, "category": "單點", "store_id": 1, "is_active": True},
    {"name": "麥可鷄塊 (6塊)", "price": 70, "category": "單點", "store_id": 1, "is_active": True},
    {"name": "伯爵紅茶", "price": 50, "category": "飲料", "store_id": 1, "is_active": True},
    {"name": "美式咖啡", "price": 60, "category": "飲料", "store_id": 1, "is_active": True},
]

async def seed_products():
    async with SessionLocal() as session:
        # Check if store exists
        result = await session.execute(text("SELECT id FROM stores WHERE id = 1"))
        store = result.scalar()
        if not store:
            logger.error("Store ID 1 not found. Please run initial_data.py (seed users/store) first.")
            return

        logger.info("Seeding products...")
        for p_data in MOCK_PRODUCTS:
            # Check if product exists
            result = await session.execute(
                text("SELECT id FROM products WHERE name = :name AND store_id = :store_id"),
                {"name": p_data["name"], "store_id": 1}
            )
            existing = result.scalar()
            
            if not existing:
                product = Product(**p_data)
                session.add(product)
                logger.info(f"Adding product: {p_data['name']}")
        
        await session.commit()
        logger.info("Product seeding completed.")

if __name__ == "__main__":
    asyncio.run(seed_products())
