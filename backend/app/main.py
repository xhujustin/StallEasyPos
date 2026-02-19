from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import os
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|172\.1[6-9]\.\d{1,3}\.\d{1,3}|172\.2\d\.\d{1,3}\.\d{1,3}|172\.3[0-1]\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    全域例外處理器
    攔截所有未處理的例外 (500 Internal Server Error)
    並確保回傳正確的 CORS 標頭，避免瀏覽器誤判為 CORS 錯誤
    """
    # 紀錄錯誤日誌 (這裡假設有 logger，若無可省略或 print)
    import traceback
    print(f"發生未預期的伺服器錯誤: {exc}")
    traceback.print_exc()

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "message": "伺服器發生內部錯誤，請聯繫系統管理員。",
            "error": str(exc) # 開發環境可顯示詳細錯誤，生產環境建議移除
        },
        headers={
            # 手動加入 CORS 標頭，確保前端能讀取到錯誤訊息
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )

# 配置靜態檔案
uploads_dir = os.path.join(os.getcwd(), "uploads")
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)
app.mount("/static", StaticFiles(directory=uploads_dir), name="static")

@app.get("/")
async def root():
    """
    健康檢查端點
    """
    return {"message": "Welcome to StallEasy POS API", "version": "1.0.0", "status": "running"}

from app.api.v1.api import api_router
app.include_router(api_router, prefix=settings.API_V1_STR)
