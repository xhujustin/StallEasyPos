from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.materials import (
    CompositeMaterialCreate, InventoryItemCreate, InventoryItemOut, InventoryTransactionOut, MaterialCreate, MaterialPurchaseCreate,
    MaterialGroupCreate, MaterialGroupOut, MaterialGroupReorder, MaterialGroupUpdate, MaterialPurchaseOut, MaterialReorder, MaterialUpdate, MaterialOut,
)
from app.services.material_service import MaterialService

router = APIRouter()

@router.put("/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_materials(store_id: int, reorder_in: MaterialReorder, db: AsyncSession = Depends(get_db)):
    if not await MaterialService.reorder_materials(db, store_id, reorder_in.material_ids):
        raise HTTPException(status_code=422, detail="耗材排序資料無效")


@router.get("/groups", response_model=List[MaterialGroupOut])
async def get_groups(store_id: int, db: AsyncSession = Depends(get_db)):
    return await MaterialService.get_groups(db, store_id)


@router.post("/groups", response_model=MaterialGroupOut, status_code=status.HTTP_201_CREATED)
async def create_group(store_id: int, group_in: MaterialGroupCreate, db: AsyncSession = Depends(get_db)):
    return await MaterialService.create_group(db, store_id, group_in)


@router.put("/groups/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_groups(store_id: int, reorder_in: MaterialGroupReorder, db: AsyncSession = Depends(get_db)):
    if not await MaterialService.reorder_groups(db, store_id, reorder_in.group_ids):
        raise HTTPException(status_code=422, detail="群組排序資料無效")


@router.put("/groups/{group_id}", response_model=MaterialGroupOut)
async def update_group(group_id: int, store_id: int, group_in: MaterialGroupUpdate, db: AsyncSession = Depends(get_db)):
    group = await MaterialService.update_group(db, group_id, store_id, group_in)
    if not group:
        raise HTTPException(status_code=404, detail="Material group not found")
    return group


@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(group_id: int, store_id: int, db: AsyncSession = Depends(get_db)):
    if not await MaterialService.delete_group(db, group_id, store_id):
        raise HTTPException(status_code=404, detail="Material group not found")


@router.post("/composites", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
async def create_composite(
    store_id: int, composite_in: CompositeMaterialCreate, db: AsyncSession = Depends(get_db)
):
    try:
        return await MaterialService.create_composite(db, store_id, composite_in)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.put("/composites/{material_id}", response_model=MaterialOut)
async def update_composite(
    material_id: int, store_id: int, composite_in: CompositeMaterialCreate, db: AsyncSession = Depends(get_db)
):
    try:
        composite = await MaterialService.update_composite(db, material_id, store_id, composite_in)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not composite:
        raise HTTPException(status_code=404, detail="Composite material not found")
    return composite


@router.get("/{material_id}/inventory-items", response_model=List[InventoryItemOut])
async def get_inventory_items(material_id: int, store_id: int, db: AsyncSession = Depends(get_db)):
    if not await MaterialService.get_material(db, material_id, store_id):
        raise HTTPException(status_code=404, detail="Material not found")
    return await MaterialService.get_inventory_items(db, material_id, store_id)


@router.post("/{material_id}/inventory-items", response_model=InventoryItemOut, status_code=status.HTTP_201_CREATED)
async def create_inventory_item(
    material_id: int, store_id: int, item_in: InventoryItemCreate, db: AsyncSession = Depends(get_db)
):
    if item_in.conversion_rate <= 0:
        raise HTTPException(status_code=422, detail="換算量必須大於 0")
    item = await MaterialService.create_inventory_item(db, material_id, store_id, item_in)
    if not item:
        raise HTTPException(status_code=404, detail="Material not found")
    return item


@router.post("/{material_id}/purchases", response_model=MaterialPurchaseOut, status_code=status.HTTP_201_CREATED)
async def receive_purchase(
    material_id: int, store_id: int, purchase_in: MaterialPurchaseCreate, db: AsyncSession = Depends(get_db)
):
    try:
        purchase = await MaterialService.receive_purchase(db, material_id, store_id, purchase_in)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not purchase:
        raise HTTPException(status_code=404, detail="Material not found")
    return purchase


@router.get("/{material_id}/purchases", response_model=List[MaterialPurchaseOut])
async def get_purchases(material_id: int, store_id: int, db: AsyncSession = Depends(get_db)):
    if not await MaterialService.get_material(db, material_id, store_id):
        raise HTTPException(status_code=404, detail="Material not found")
    return await MaterialService.get_purchases(db, material_id, store_id)


@router.get("/{material_id}/transactions", response_model=List[InventoryTransactionOut])
async def get_transactions(
    material_id: int, store_id: int, limit: int = 200, db: AsyncSession = Depends(get_db)
):
    if not await MaterialService.get_material(db, material_id, store_id):
        raise HTTPException(status_code=404, detail="Material not found")
    return await MaterialService.get_transactions(db, material_id, store_id, limit)


@router.get("/{material_id}/usage")
async def get_material_usage(material_id: int, store_id: int, db: AsyncSession = Depends(get_db)):
    summary = await MaterialService.get_usage_summary(db, material_id, store_id)
    if summary is None:
        raise HTTPException(status_code=404, detail="Material not found")
    return summary

@router.post("/", response_model=MaterialOut, status_code=status.HTTP_201_CREATED)
async def create_material(
    store_id: int,
    material_in: MaterialCreate,
    db: AsyncSession = Depends(get_db)
):
    """建立耗材"""
    if material_in.default_conversion_rate is not None and material_in.default_conversion_rate <= 0:
        raise HTTPException(status_code=422, detail="換算量必須大於 0")
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
    try:
        success = await MaterialService.delete_material(db, material_id, store_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not success:
        raise HTTPException(status_code=404, detail="Material not found")
    return None

@router.post("/{material_id}/disconnect-and-delete", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_and_delete_material(
    material_id: int, store_id: int, db: AsyncSession = Depends(get_db)
):
    if not await MaterialService.disconnect_and_delete_material(db, material_id, store_id):
        raise HTTPException(status_code=404, detail="Material not found")
    return None

@router.post("/{material_id}/replace-and-delete", status_code=status.HTTP_204_NO_CONTENT)
async def replace_and_delete_material(
    material_id: int, replacement_id: int, store_id: int, db: AsyncSession = Depends(get_db)
):
    try:
        success = await MaterialService.replace_and_delete_material(db, material_id, replacement_id, store_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not success:
        raise HTTPException(status_code=404, detail="Material or replacement not found")
    return None
