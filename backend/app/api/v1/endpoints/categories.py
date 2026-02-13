from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.categories import CategoryCreate, CategoryUpdate, CategoryOut
from app.services.category_service import CategoryService

router = APIRouter()

@router.post("/", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    store_id: int,
    category_in: CategoryCreate,
    db: AsyncSession = Depends(get_db)
):
    """建立分類"""
    category = await CategoryService.create_category(db, store_id, category_in)
    return category

@router.get("/", response_model=List[CategoryOut])
async def get_categories(
    store_id: int,
    db: AsyncSession = Depends(get_db)
):
    """取得店鋪所有分類"""
    categories = await CategoryService.get_categories(db, store_id)
    return categories

@router.get("/{category_id}", response_model=CategoryOut)
async def get_category(
    category_id: int,
    store_id: int,
    db: AsyncSession = Depends(get_db)
):
    """取得單一分類"""
    category = await CategoryService.get_category(db, category_id, store_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@router.put("/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: int,
    store_id: int,
    category_in: CategoryUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新分類"""
    category = await CategoryService.update_category(db, category_id, store_id, category_in)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    store_id: int,
    db: AsyncSession = Depends(get_db)
):
    """刪除分類"""
    success = await CategoryService.delete_category(db, category_id, store_id)
    if not success:
        raise HTTPException(status_code=404, detail="Category not found")
    return None
