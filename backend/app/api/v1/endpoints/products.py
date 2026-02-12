from typing import List, Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, get_current_user_id
from app.services.product_service import ProductService
from app.schemas.products import ProductCreate, ProductUpdate, ProductOut
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
