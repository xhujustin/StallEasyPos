@echo off
REM 資料庫遷移腳本

echo 啟動虛擬環境...
if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
) else if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo 錯誤: 找不到虛擬環境
    echo 請先執行 setup_backend.bat 建立虛擬環境
    pause
    exit /b 1
)

echo.
echo 執行資料庫遷移...
alembic upgrade head

if %ERRORLEVEL% EQU 0 (
    echo.
    echo 資料庫遷移成功完成!
) else (
    echo.
    echo 資料庫遷移失敗,請檢查錯誤訊息
)

echo.
pause
