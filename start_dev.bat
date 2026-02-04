@echo off
chcp 65001 >nul
setlocal
echo ==========================================
echo       StallEasyPos 前端開啟程式
echo ==========================================
echo Starting StallEasy POS Development Server...
cd frontend
npm run dev
