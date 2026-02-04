from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.logging import setup_logging

# 設定日誌
setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="StallEasy POS 後端 API 服務",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# 設定 CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.get("/")
async def root():
    """
    健康檢查端點
    """
    return {"message": "Welcome to StallEasy POS API", "version": "1.0.0", "status": "running"}

# TODO: 引入 API 路由
# from app.api.v1.api import api_router
# app.include_router(api_router, prefix=settings.API_V1_STR)
