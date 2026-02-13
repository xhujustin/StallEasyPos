from typing import List, Optional
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.material import Material
from app.schemas.materials import MaterialCreate, MaterialUpdate

class MaterialService:
    @staticmethod
    async def create_material(db: AsyncSession, store_id: int, material_in: MaterialCreate) -> Material:
        """建立耗材"""
        material = Material(
            store_id=store_id,
            name=material_in.name,
            unit=material_in.unit,
            stock_quantity=material_in.stock_quantity,
            unit_cost=material_in.unit_cost,
            low_stock_threshold=material_in.low_stock_threshold
        )
        db.add(material)
        await db.commit()
        await db.refresh(material)
        return material

    @staticmethod
    async def get_materials(db: AsyncSession, store_id: int) -> List[Material]:
        """取得店鋪所有耗材"""
        result = await db.execute(
            select(Material)
            .where(Material.store_id == store_id)
            .order_by(Material.name)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_material(db: AsyncSession, material_id: int, store_id: int) -> Optional[Material]:
        """取得單一耗材"""
        result = await db.execute(
            select(Material)
            .where(Material.id == material_id, Material.store_id == store_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_material(
        db: AsyncSession, 
        material_id: int, 
        store_id: int, 
        material_in: MaterialUpdate
    ) -> Optional[Material]:
        """更新耗材"""
        material = await MaterialService.get_material(db, material_id, store_id)
        if not material:
            return None

        update_data = material_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(material, field, value)

        await db.commit()
        await db.refresh(material)
        return material

    @staticmethod
    async def delete_material(db: AsyncSession, material_id: int, store_id: int) -> bool:
        """刪除耗材"""
        material = await MaterialService.get_material(db, material_id, store_id)
        if not material:
            return False

        await db.delete(material)
        await db.commit()
        return True

    @staticmethod
    async def update_stock(
        db: AsyncSession, 
        material_id: int, 
        store_id: int, 
        quantity_change: Decimal
    ) -> Optional[Material]:
        """更新庫存(增加或減少)"""
        material = await MaterialService.get_material(db, material_id, store_id)
        if not material:
            return None

        material.stock_quantity += quantity_change
        await db.commit()
        await db.refresh(material)
        return material

    @staticmethod
    async def get_low_stock_materials(db: AsyncSession, store_id: int) -> List[Material]:
        """取得低庫存耗材"""
        result = await db.execute(
            select(Material)
            .where(
                Material.store_id == store_id,
                Material.stock_quantity <= Material.low_stock_threshold
            )
            .order_by(Material.stock_quantity)
        )
        return list(result.scalars().all())
