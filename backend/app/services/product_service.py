from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.product import Product
from app.schemas.products import ProductCreate, ProductUpdate
from app.services.store_service import StoreService

class ProductService:
    """
    商品服務: CRUD
    """
    
    @staticmethod
    async def create_product(
        db: AsyncSession, store_id: int, product_in: ProductCreate, user_id: int
    ) -> Product:
        """建立商品 (需先驗證 Store 權限)"""
        # 驗證權限
        await StoreService.get_store_if_authorized(db, store_id, user_id)
        
        product = Product(
            store_id=store_id,
            **product_in.model_dump()
        )
        db.add(product)
        await db.commit()
        await db.refresh(product)
        return product

    @staticmethod
    async def get_store_products(
        db: AsyncSession, store_id: int, user_id: int
    ) -> List[Product]:
        """取得店鋪商品列表"""
        # 驗證權限 (讀取權限)
        await StoreService.get_store_if_authorized(db, store_id, user_id)
        
        result = await db.execute(
            select(Product).where(Product.store_id == store_id)
        )
        return result.scalars().all()

    @staticmethod
    async def update_product(
        db: AsyncSession, product_id: int, product_in: ProductUpdate, user_id: int
    ) -> Product:
        """更新商品"""
        product = await db.get(Product, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
            
        # 驗證 Store 權限
        await StoreService.get_store_if_authorized(db, product.store_id, user_id)
        
        update_data = product_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(product, key, value)
            
        await db.commit()
        await db.refresh(product)
        return product

    @staticmethod
    async def get_product(
        db: AsyncSession, product_id: int, store_id: int, user_id: int
    ) -> Product:
        """取得單一商品"""
        # 驗證權限
        await StoreService.get_store_if_authorized(db, store_id, user_id)
        
        product = await db.get(Product, product_id)
        if not product or product.store_id != store_id:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return product

    @staticmethod
    async def delete_product(
        db: AsyncSession, product_id: int, store_id: int, user_id: int
    ) -> None:
        """刪除商品"""
        # 驗證權限
        await StoreService.get_store_if_authorized(db, store_id, user_id)
        
        product = await db.get(Product, product_id)
        if not product or product.store_id != store_id:
            raise HTTPException(status_code=404, detail="Product not found")
        
        await db.delete(product)
        await db.commit()
