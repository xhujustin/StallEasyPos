@echo off
:: 設定編碼為 UTF-8
chcp 65001 >nul
setlocal
cd /d "%~dp0..\.."
echo ==========================================
echo       StallEasyPos 前端安裝程式
echo ==========================================

:: 檢查 frontend 資料夾是否存在
if exist "frontend" (
    echo [資訊] 'frontend' 資料夾已存在。跳過 create-next-app。
) else (
    echo [資訊] 正在建立 Next.js 應用程式...
    call npx -y create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
)

cd frontend

echo.
echo [資訊] 正在安裝額外依賴元件...
:: 安裝核心依賴
call npm install lucide-react zustand dexie @tanstack/react-query clsx tailwind-merge class-variance-authority tailwindcss-animate -f

echo.
echo [資訊] 正在初始化 Shadcn UI...
:: 初始化 Shadcn (若已存在會詢問覆蓋，加 -y 自動確認 defaults)
if not exist "components.json" (
    call npx shadcn@latest init -y
) else (
    echo [資訊] components.json 已存在，跳過 shadcn init。
)

echo.
echo [資訊] 正在安裝/更新 Shadcn 元件...
:: 批量安裝所需組件
call npx shadcn@latest add button card input label dialog sonner table separator badge avatar scroll-area toast -y

echo.
echo ==========================================
echo       前端安裝完成！
echo ==========================================
echo 您現在可以執行以下指令：
echo cd frontend
echo npm run dev
timeout /t 5
