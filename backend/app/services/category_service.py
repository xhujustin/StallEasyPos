from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.category import Category
from app.schemas.categories import CategoryCreate, CategoryUpdate

class CategoryService:
    @staticmethod
    async def create_category(db: AsyncSession, store_id: int, category_in: CategoryCreate) -> Category:
        """建立分類"""
        category = Category(
            store_id=store_id,
            name=category_in.name,
            description=category_in.description,
            display_order=category_in.display_order,
        )
        db.add(category)
        await db.commit()
        await db.refresh(category)
        return category

    @staticmethod
    async def get_categories(db: AsyncSession, store_id: int) -> List[Category]:
        """取得店鋪所有分類"""
        result = await db.execute(
            select(Category)
            .where(Category.store_id == store_id)
            .order_by(Category.display_order, Category.name)
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_category(db: AsyncSession, category_id: int, store_id: int) -> Optional[Category]:
        """取得單一分類"""
        result = await db.execute(
            select(Category)
            .where(Category.id == category_id, Category.store_id == store_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def update_category(
        db: AsyncSession, 
        category_id: int, 
        store_id: int, 
        category_in: CategoryUpdate
    ) -> Optional[Category]:
        """更新分類"""
        category = await CategoryService.get_category(db, category_id, store_id)
        if not category:
            return None

        update_data = category_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(category, field, value)

        await db.commit()
        await db.refresh(category)
        return category

    @staticmethod
    async def delete_category(db: AsyncSession, category_id: int, store_id: int) -> bool:
        """刪除分類"""
        category = await CategoryService.get_category(db, category_id, store_id)
        if not category:
            return False

        await db.delete(category)
        await db.commit()
        return True

    @staticmethod
    async def reorder_categories(db: AsyncSession, store_id: int, category_ids: List[int]) -> bool:
        result = await db.execute(select(Category).where(Category.store_id == store_id, Category.id.in_(category_ids)))
        categories = {category.id: category for category in result.scalars().all()}
        if len(categories) != len(category_ids):
            return False
        for position, category_id in enumerate(category_ids, start=1):
            categories[category_id].display_order = position
        await db.commit()
        return True
