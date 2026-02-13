from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.materials import MaterialCreate, MaterialUpdate, MaterialOut
from app.services.material_service import MaterialService

router = APIRouter()

@router.post("/", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
async def create_material(
    store_id: int,
    material_in: MaterialCreate,
    db: AsyncSession = Depends(get_db)
):
    """建立耗材"""
    material = await MaterialService.create_material(db, store_id, material_in)
    return material

@router.get("/", response_model=List[MaterialOut])
async def get_materials(
    store_id: int,
    db: AsyncSession = Depends(get_db)
):
    """取得店鋪所有耗材"""
    materials = await MaterialService.get_materials(db, store_id)
    return materials

@router.get("/low-stock", response_model=List[MaterialOut])
async def get_low_stock_materials(
    store_id: int,
    db: AsyncSession = Depends(get_db)
):
    """取得低庫存耗材"""
    materials = await MaterialService.get_low_stock_materials(db, store_id)
    return materials

@router.get("/{material_id}", response_model=MaterialOut)
async def get_material(
    material_id: int,
    store_id: int,
    db: AsyncSession = Depends(get_db)
):
    """取得單一耗材"""
    material = await MaterialService.get_material(db, material_id, store_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material

@router.put("/{material_id}", response_model=MaterialOut)
async def update_material(
    material_id: int,
    store_id: int,
    material_in: MaterialUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新耗材"""
    material = await MaterialService.update_material(db, material_id, store_id, material_in)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material

@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(
    material_id: int,
    store_id: int,
    db: AsyncSession = Depends(get_db)
):
    """刪除耗材"""
    success = await MaterialService.delete_material(db, material_id, store_id)
    if not success:
        raise HTTPException(status_code=404, detail="Material not found")
    return None
