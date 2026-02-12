from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, stores, users, products, orders, 
    payments, invoices, closing, adjustments, audit
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(stores.router, prefix="/stores", tags=["Stores"])


api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(closing.router, prefix="/closing", tags=["Closing"])
api_router.include_router(adjustments.router, prefix="/adjustments", tags=["Adjustments"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit"])



