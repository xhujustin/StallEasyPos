# StallEasy POS Backend

基於 FastAPI + PostgreSQL 的高效能後端系統。

## 技術架構

- **Language**: Python 3.11+
- **Framework**: FastAPI
- **Database**: PostgreSQL (Async via `asyncpg`)
- **ORM**: SQLAlchemy 2.0+
- **Auth**: JWT (OAuth2 Password Bearer) with `python-jose`

## 快速開始 (Windows)

Windows 腳本統一放在專案根目錄的 `scripts/windows/`。

1. **進入專案根目錄**
   ```powershell
   cd StallEasyPos
   ```

2. **設定環境變數**
   複製範本並修改設定：
   ```powershell
   copy backend\.env.example backend\.env
   ```
   *請務必修改 `DATABASE_URL` 與 `SECRET_KEY`*

3. **啟動伺服器**
   雙擊 `scripts\windows\start-backend.bat` 或在終端機執行：
   ```powershell
   .\scripts\windows\start-backend.bat
   ```
   腳本會自動：
   - 建立/啟用 `venv`
   - **檢查資料庫同步狀態 (`check_db.py`)** <new>
   - 安裝依賴 (`requirements.txt`)
   - 啟動 Uvicorn（預設綁定 `0.0.0.0:8000`，可由區網裝置連線）

## 目錄結構

```
backend/
├── app/
│   ├── api/            # API路由 (v1)
│   ├── core/           # 核心設定 (Config, DB, Security)
│   ├── models/         # SQLAlchemy 資料庫模型 (ORM)
│   ├── schemas/        # Pydantic 資料驗證模型
│   ├── services/       # 業務邏輯層
│   └── workers/        # 非同步任務與排程
├── requirements.txt    # Python 依賴清單
└── Dockerfile          # 容器化部署設定
```

## API 文件

啟動後可訪問：
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
