@echo off
chcp 65001 >nul
setlocal
echo ==========================================
echo       StallEasyPos 前端開啟程式 (僅限本機)
echo ==========================================
echo Starting StallEasy POS Development Server...
cd /d "%~dp0..\..\frontend"
npm run dev:local
