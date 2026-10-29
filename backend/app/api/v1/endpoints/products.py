from typing import List, Annotated
from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.services.product_service import ProductService
from app.services.upload_service import UploadService
from app.schemas.products import ProductCreate, ProductUpdate, ProductOut, ProductReorder
from app.schemas.common import ResponseBase

router = APIRouter()

@router.post("/", response_model=ResponseBase[ProductOut])
async def create_product(
    store_id: Annotated[int, Query()],
    product_in: ProductCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """
    建立商品
    """
    product = await ProductService.create_product(db, store_id, product_in, current_user_id)
    return ResponseBase(data=product)

@router.get("/", response_model=ResponseBase[List[ProductOut]])
async def list_products(
    store_id: Annotated[int, Query()],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """
    取得店鋪商品
    """
    products = await ProductService.get_store_products(db, store_id, current_user_id)
    return ResponseBase(data=products)

@router.put("/reorder", response_model=ResponseBase[bool])
async def reorder_products(
    store_id: Annotated[int, Query()],
    reorder_in: ProductReorder,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """儲存店鋪商品顯示順序。"""
    await ProductService.reorder_products(
        db, store_id, reorder_in.product_ids, current_user_id
    )
    return ResponseBase(data=True)

@router.patch("/{product_id}", response_model=ResponseBase[ProductOut])
async def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """
    更新商品
    """
    product = await ProductService.update_product(db, product_id, product_in, current_user_id)
    return ResponseBase(data=product)

@router.get("/{product_id}", response_model=ResponseBase[ProductOut])
async def get_product(
    product_id: int,
    store_id: Annotated[int, Query()],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """
    取得單一商品
    """
    product = await ProductService.get_product(db, product_id, store_id, current_user_id)
    return ResponseBase(data=product)

@router.delete("/{product_id}", response_model=ResponseBase[bool])
async def delete_product(
    product_id: int,
    store_id: Annotated[int, Query()],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """
    刪除商品
    """
    await ProductService.delete_product(db, product_id, store_id, current_user_id)
    return ResponseBase(data=True)

@router.post("/upload-image", response_model=ResponseBase[str])
async def upload_product_image(
    store_id: Annotated[int, Query()],
    file: UploadFile = File(...),
    old_url: Annotated[str, Query()] = None,
    current_user_id: Annotated[int, Depends(get_current_user_id)] = None
):
    """
    上傳商品圖片
    """
    image_url = await UploadService.save_product_image(store_id, file, old_url)
    return ResponseBase(data=image_url)
