from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from loguru import logger

class StallEasyException(Exception):
    """
    專案基礎異常類別
    """
    def __init__(self, code: int, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code

async def global_exception_handler(request: Request, exc: Exception):
    """
    全域異常處理器
    """
    if isinstance(exc, StallEasyException):
        logger.warning(f"Business Error: {exc.message} ({exc.code})")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": exc.code,
                "message": exc.message,
                "details": []
            }
        )
    
    if isinstance(exc, HTTPException):
        logger.warning(f"HTTP Error: {exc.detail} ({exc.status_code})")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": exc.status_code,  # 使用 HTTP status 作為錯誤碼
                "message": str(exc.detail),
                "details": []
            }
        )

    logger.error(f"System Error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "code": 500,
            "message": "Internal Server Error",
            "details": [str(exc)] # 生產環境建議隱藏詳細錯誤
        }
    )
