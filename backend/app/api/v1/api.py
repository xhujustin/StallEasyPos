from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, stores, users, products, orders, 
    payments, invoices, closing, adjustments, audit
)

api_router = APIRouter()

# 註解掉尚未實作的 router 以避免啟動錯誤，待各模組實作後解開
# api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
# api_router.include_router(stores.router, prefix="/stores", tags=["Stores"])
# ...
