@echo off
chcp 65001 >nul
setlocal
echo ==========================================
echo       StallEasyPos 前端開啟程式 (外部連線模式)
echo       請在手機/平板瀏覽器輸入: 
echo       http://[電腦IP]:3000
echo ==========================================
echo Starting StallEasy POS Development Server on 0.0.0.0...
cd /d "%~dp0..\..\frontend"
npm run dev
