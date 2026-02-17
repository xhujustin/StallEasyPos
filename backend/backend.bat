@echo off
chcp 65001 > nul
setlocal

:: Backend 開發啟動腳本
:: 功能: 自動檢查/建立 venv、安裝依賴、啟動 Uvicorn server

echo [INFO] 正在檢查 Python 環境...

:: 檢查是否有 Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] 找不到 Python，請確認已安裝 Python 3.11+ 並加入 PATH。
    pause
    exit /b 1
)

:: 設定 venv 資料夾名稱
set VENV_DIR=.venv

:: 檢查 venv 是否存在
if not exist %VENV_DIR% (
    echo [INFO] 虛擬環境不存在，正在建立 %VENV_DIR%...
    python -m venv %VENV_DIR%
    if %errorlevel% neq 0 (
        echo [ERROR] 建立虛擬環境失敗。
        pause
        exit /b 1
    )
    echo [INFO] 虛擬環境建立成功。
)

:: 啟動 venv
call %VENV_DIR%\Scripts\activate
if %errorlevel% neq 0 (
    echo [ERROR] 無法啟用虛擬環境。
    pause
    exit /b 1
)

:: 檢查並安裝依賴
if exist requirements.txt (
    echo [INFO] 正在檢查並安裝依賴...
    pip install -r requirements.txt
) else (
    echo [WARNING] 找不到 requirements.txt，跳過依賴安裝。
)

:: 檢查並執行資料庫遷移
if exist alembic.ini (
    echo [INFO] 正在檢查並執行資料庫遷移...
    alembic upgrade head
)

:: 執行資料庫同步檢查 (Double Check)
if exist scripts\check_db.py (
    echo [INFO] 正在進行資料庫同步安全性檢查...
    python scripts\check_db.py
    if %errorlevel% neq 0 (
        echo [ERROR] 資料庫檢查失敗，請依指示修復後再啟動。
        pause
        exit /b 1
    )
)

:: 啟動 Uvicorn
echo [INFO] 正在啟動後端伺服器 (Host: 0.0.0.0, Port: 8000)...
echo [INFO] 按 Ctrl+C 可停止伺服器
echo.

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

endlocal
