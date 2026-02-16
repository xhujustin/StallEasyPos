from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    users,
    stores,
    products,
    orders,
    payments,
    closing,
    adjustments,
    invoices,
    audit,
    categories,
    materials,
    dashboard,
    shifts,
    settings,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(stores.router, prefix="/stores", tags=["stores"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(materials.router, prefix="/materials", tags=["materials"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(closing.router, prefix="/closing", tags=["closing"])
api_router.include_router(adjustments.router, prefix="/adjustments", tags=["adjustments"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(shifts.router, prefix="/shifts", tags=["shifts"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
