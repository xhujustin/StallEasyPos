from typing import List, Optional
from sqlalchemy import select, delete
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.product import Product
from app.models.product_material import ProductMaterial
from app.models.material import Material
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
        
        product_data = product_in.model_dump(exclude={"materials"})
        materials_data = product_in.materials

        product = Product(
            store_id=store_id,
            **product_data
        )
        db.add(product)
        await db.flush() # 確保取得 product.id

        if materials_data:
            for mat in materials_data:
                pm = ProductMaterial(
                    product_id=product.id,
                    material_id=mat.material_id,
                    quantity=mat.quantity
                )
                db.add(pm)

        await db.commit()
        
        # 重新載入包含關聯的資料
        stmt = select(Product).options(
            joinedload(Product.materials).joinedload(ProductMaterial.material)
        ).where(Product.id == product.id)
        result = await db.execute(stmt)
        return result.scalars().first()


    @staticmethod
    async def get_store_products(
        db: AsyncSession, store_id: int, user_id: int
    ) -> List[Product]:
        """取得店鋪商品列表"""
        # 驗證權限 (讀取權限)
        await StoreService.get_store_if_authorized(db, store_id, user_id)
        
        # 必須預先載入 materials，因為 ProductOut schema 包含此欄位
        # 否則會觸發 MissingGreenlet error (非同步環境下無法懶加載)
        stmt = select(Product).options(
            joinedload(Product.materials).joinedload(ProductMaterial.material)
        ).where(Product.store_id == store_id)
        
        result = await db.execute(stmt)
        return result.scalars().unique().all()

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
        
        update_data = product_in.model_dump(exclude_unset=True, exclude={"materials"})
        materials_data = product_in.materials

        for key, value in update_data.items():
            setattr(product, key, value)
            
        # 處理 materials 更新
        if materials_data is not None:
            # 刪除舊的關聯
            await db.execute(delete(ProductMaterial).where(ProductMaterial.product_id == product.id))
            
            # 新增新的關聯
            for mat in materials_data:
                pm = ProductMaterial(
                    product_id=product.id,
                    material_id=mat.material_id,
                    quantity=mat.quantity
                )
                db.add(pm)
            
        await db.commit()
        
        # 重新載入包含關聯的資料
        stmt = select(Product).options(
            joinedload(Product.materials).joinedload(ProductMaterial.material)
        ).where(Product.id == product_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def get_product(
        db: AsyncSession, product_id: int, store_id: int, user_id: int
    ) -> Product:
        """取得單一商品"""
        # 驗證權限
        await StoreService.get_store_if_authorized(db, store_id, user_id)
        
        stmt = select(Product).options(
            joinedload(Product.materials).joinedload(ProductMaterial.material)
        ).where(Product.id == product_id)
        result = await db.execute(stmt)
        product = result.scalars().first()
        
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
        
        # 為了避免 MissingGreenlet 錯誤 (當刪除帶有 relationship 的物件時),
        # 我們預先載入或者是依靠資料庫層級的 ON DELETE CASCADE
        # 這裡我們使用 options 預先載入以防萬一 SQLAlchemy 需要處理 python 側的 cascade
        stmt = select(Product).options(
             joinedload(Product.materials)
        ).where(Product.id == product_id)
        result = await db.execute(stmt)
        product = result.scalars().first()
        
        if not product or product.store_id != store_id:
            raise HTTPException(status_code=404, detail="Product not found")
        
        await db.delete(product)
        await db.commit()
