import sys
from loguru import logger

def setup_logging():
    """
    設定 Loguru 日誌系統
    - 移除預設 handler
    - 新增標準輸出 handler (無 Icon)
    """
    logger.remove()
    
    # 定義日誌格式 (移除 icon，僅保留文字資訊)
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>"
    )
    
    logger.add(
        sys.stderr,
        format=log_format,
        level="INFO",
        colorize=True
    )
    
    # 可在此處新增檔案輸出
    # logger.add("logs/app.log", rotation="500 MB", level="INFO")

    logger.info("日誌系統初始化完成")
