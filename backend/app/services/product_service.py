from typing import List, Optional
from sqlalchemy import select, delete, func
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.product import Product
from app.models.product_material import ProductMaterial
from app.models.product_attribute import ProductAttribute, ProductAttributeOption, OptionMaterial
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
        
        product_data = product_in.model_dump(exclude={"materials", "attributes"})
        materials_data = product_in.materials
        attributes_data = product_in.attributes

        max_order_result = await db.execute(
            select(func.coalesce(func.max(Product.display_order), 0)).where(
                Product.store_id == store_id
            )
        )
        next_display_order = int(max_order_result.scalar_one()) + 1

        product = Product(
            store_id=store_id,
            display_order=next_display_order,
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

        if attributes_data:
            for attr_in in attributes_data:
                attr = ProductAttribute(
                    product_id=product.id,
                    name=attr_in.name,
                    min_selection=attr_in.min_selection,
                    max_selection=attr_in.max_selection,
                    display_order=attr_in.display_order
                )
                db.add(attr)
                await db.flush()

                for opt_in in attr_in.options:
                    opt = ProductAttributeOption(
                        attribute_id=attr.id,
                        name=opt_in.name,
                        price_adjustment=opt_in.price_adjustment,
                        is_active=opt_in.is_active,
                        display_order=opt_in.display_order
                    )
                    db.add(opt)
                    await db.flush()
                    
                    if opt_in.materials:
                         for mat_in in opt_in.materials:
                             om = OptionMaterial(
                                 option_id=opt.id,
                                 material_id=mat_in.material_id,
                                 quantity=mat_in.quantity
                             )
                             db.add(om)

        await db.commit()
        
        # 重新載入包含關聯的資料
        stmt = select(Product).options(
            joinedload(Product.materials).joinedload(ProductMaterial.material),
            joinedload(Product.attributes).joinedload(ProductAttribute.options).joinedload(ProductAttributeOption.materials).joinedload(OptionMaterial.material)
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
            joinedload(Product.materials).joinedload(ProductMaterial.material),
            joinedload(Product.attributes).joinedload(ProductAttribute.options).joinedload(ProductAttributeOption.materials).joinedload(OptionMaterial.material)
        ).where(Product.store_id == store_id).order_by(
            Product.display_order.asc(), Product.id.asc()
        )
        
        result = await db.execute(stmt)
        return result.scalars().unique().all()

    @staticmethod
    async def reorder_products(
        db: AsyncSession, store_id: int, product_ids: List[int], user_id: int
    ) -> None:
        """以傳入的完整商品 ID 清單更新店鋪商品順序。"""
        await StoreService.get_store_if_authorized(db, store_id, user_id)

        if len(product_ids) != len(set(product_ids)):
            raise HTTPException(status_code=400, detail="Duplicate product IDs")

        result = await db.execute(
            select(Product).where(Product.store_id == store_id)
        )
        products = result.scalars().all()
        products_by_id = {product.id: product for product in products}

        if set(product_ids) != set(products_by_id):
            raise HTTPException(
                status_code=400,
                detail="Product list must contain every product in this store",
            )

        for display_order, product_id in enumerate(product_ids, start=1):
            products_by_id[product_id].display_order = display_order

        await db.commit()

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
        
        update_data = product_in.model_dump(exclude_unset=True, exclude={"materials", "attributes"})
        materials_data = product_in.materials
        attributes_data = product_in.attributes

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

        # 處理 attributes 更新 (全刪全建)
        if attributes_data is not None:
             await db.execute(delete(ProductAttribute).where(ProductAttribute.product_id == product.id))
             
             for attr_in in attributes_data:
                attr = ProductAttribute(
                    product_id=product.id,
                    name=attr_in.name,
                    min_selection=attr_in.min_selection,
                    max_selection=attr_in.max_selection,
                    display_order=attr_in.display_order
                )
                db.add(attr)
                await db.flush()

                for opt_in in attr_in.options:
                    opt = ProductAttributeOption(
                        attribute_id=attr.id,
                        name=opt_in.name,
                        price_adjustment=opt_in.price_adjustment,
                        is_active=opt_in.is_active,
                        display_order=opt_in.display_order
                    )
                    db.add(opt)
                    await db.flush()
                    
                    if opt_in.materials:
                         for mat_in in opt_in.materials:
                             om = OptionMaterial(
                                 option_id=opt.id,
                                 material_id=mat_in.material_id,
                                 quantity=mat_in.quantity
                             )
                             db.add(om)
            
        await db.commit()
        
        # 重新載入包含關聯的資料
        stmt = select(Product).options(
            joinedload(Product.materials).joinedload(ProductMaterial.material),
            joinedload(Product.attributes).joinedload(ProductAttribute.options).joinedload(ProductAttributeOption.materials).joinedload(OptionMaterial.material)
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
            joinedload(Product.materials).joinedload(ProductMaterial.material),
            joinedload(Product.attributes).joinedload(ProductAttribute.options).joinedload(ProductAttributeOption.materials).joinedload(OptionMaterial.material)
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
