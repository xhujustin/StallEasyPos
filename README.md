# StallEasy POS

![Logo](image/loog.png)


StallEasy POS 是一套專為小吃攤與小型店家設計的 POS 系統，
主打 **稅務安心、離線可用、可稽核、可演進 AI**。

## 核心特色

### POS 收銀系統
- **多種支付方式**：現金、LINE Pay（規劃中）
- **智能鍵盤**：支援實體鍵盤快捷鍵操作
- **快速金額**：常用金額快速選擇
- **離線營運**：無網路也能正常收銀
- **iPad 支援**：支援 iPad/平板橫屏全螢幕 PWA 模式 (iOS Safari -> 加入主畫面)

### 區域網路連線
- **動態 API URL**：系統自動偵測伺服器來源，支援平板透過區網連線無需手動設定 IP
- **自動化 CORS**：後端自動處理區網連線安全權限

### 權限管理 (RBAC)
- **三種角色**：員工 (Staff)、主管 (Manager)、老闆 (Owner)
- **主管授權**：員工日結需主管 PIN 驗證
- **路由保護**：基於角色的頁面訪問控制

### 多店管理
- **店鋪選擇**：登入後選擇要操作的店鋪
- **角色顯示**：顯示使用者在每個店鋪的角色
- **店鋪切換**：支援多店鋪使用者切換操作店鋪
- **管理入口**：老闆帳號可訪問店鋪管理後台，所有頁面支援 Branding Logo 顯示

### 管理功能
- **訂單管理**：查看、即時搜尋編號、日期過濾、作廢訂單。
- **報表與班次系統**：
  - **日結報表**：每日營收統計與結算，支援電子預覽功能（施工中）。
  - **班次紀錄**：整合「班次 ID」與「狀態」顯示，支持精準日期過濾。
  - **分頁系統**：全域管理頁面支援 20 筆/頁高效分頁。
- **後台全域 UI 統一佈局**：
  - **兩段式佈局**：標題與全域按鈕在頂部，過濾器收納入獨立卡片區塊。
  - **自動搜尋**：搜尋框支援即時輸入自動過濾，無需手動點擊搜尋鈕。
- **商品管理系統**：
  - **分類管理**：建立商品分類,支援中文名稱
  - **耗材管理**：追蹤原料庫存、成本計算、低庫存警告
  - **商品屬性**：彈性的屬性與選項系統 (如: 甜度、冰塊、加料)
  - **排序優化**：支援拖放 (Drag-and-Drop) 快速調整選項順序
  - **成本計算**：整合耗材成本與店鋪固定成本
  - **圖片上傳**：商品圖片管理(規劃中)
  - **店鋪切換**：Admin介面支援下拉選單快速切換店鋪
- **用戶管理**：員工帳號與權限設定

### 離線優先
- **IndexedDB 儲存**：本地資料持久化
- **自動同步**：網路恢復後自動上傳
- **去重機制**：防止重複訂單
- **同步指示器**：即時顯示同步狀態

### 現代化 UI
- **響應式設計**：支援各種螢幕尺寸
- **CSS Modules**：模組化樣式管理
- **無障礙支援**：符合 WCAG 標準
- **流暢動畫**：優質使用者體驗

## 快速開始

### 開發環境需求
- Node.js 18+
- npm 或 yarn

### 安裝與啟動

```bash
# 進入前端目錄
cd frontend

# 安裝依賴
npm install

# 啟動開發伺服器 (Frontend)
npm run dev

# 啟動開發伺服器 (Backend)
```bash
# 進入後端目錄
cd backend

# 首次安裝與初始化 (Windows)
# 此腳本會自動:
# 1. 建立 .env (若不存在)
# 2. 建立 Python 虛擬環境
# 3. 安裝依賴
# 4. 執行資料庫遷移 (建立表格)
# 5. 填充初始資料
.\setup_backend.bat

# 注意:
# 腳本執行後，請檢查產生的 .env 檔案
# 務必修改 SECRET_KEY 與 DATABASE_URL (若您的資料庫密碼非預設值)

# 日常啟動伺服器
.\backend.bat

# 使用批次檔快速啟動
.\start_dev.bat      (僅本機)
.\start_dev_lan.bat  (支援手機平板連線)
```

訪問 http://localhost:3000 (本機) 或 http://[電腦IP]:3000 (手機平板) 開始使用

### 預設帳號

| 角色 | PIN | 權限 |
|------|-----|------|
| 老闆 | 0000 | 完整權限 |
| 主管 | 1111 | 日結、授權 |
| 員工 | 2222 | 收銀、訂單 |

## 專案結構

```
StallEasyPos-V1.0.0/
├── frontend/                 # Next.js 前端應用
│   ├── src/
│   │   ├── app/             # App Router 頁面
│   │   │   ├── (public)/   # 公開頁面 (Login)
│   │   │   ├── (pos)/      # POS 收銀主程式
│   │   │   └── (admin)/    # 後台管理系統
│   │   ├── components/      # React 組件庫
│   │   │   ├── ui/         # Shadcn UI 基礎組件
│   │   │   └── pos/        # POS 業務組件 (Checkout, Cart)
│   │   ├── lib/            # 核心邏輯層
│   │   │   ├── api/        # API 客戶端 (Auth, Products, Orders)
│   │   │   ├── store/      # Zustand 狀態管理 (Auth, Cart)
│   │   │   ├── db/         # IndexedDB (Dexie) 離線儲存
│   │   │   └── sync/       # 同步服務邏輯
│   │   └── proxy.ts        # Next.js Middleware (RBAC/Auth)
│   └── package.json
├── backend/                # FastAPI 後端應用
│   ├── app/                # 應用程式源碼
│   │   ├── api/v1/         # API 路由與 Endpoints (Auth, Products, Orders...)
│   │   ├── models/         # SQLAlchemy 資料庫模型 (User, Store, Product...)
│   │   ├── schemas/        # Pydantic 資料驗證模型
│   │   ├── services/       # 業務邏輯層 (Business Logic)
│   │   ├── core/           # 核心配置 (Database, Security, Config)
│   │   ├── workers/        # 背景任務處理 (Celery/Async)
│   │   ├── initial_data.py # 資料庫初始化腳本
│   │   ├── seed_products.py# 商品種子資料腳本
│   │   └── main.py         # FastAPI 入口文件
│   ├── .env                # 環境變數設定
│   ├── alembic/            # 資料庫遷移工具
│   ├── scripts/            # 維護與工具腳本 (New)
│   ├── backend.bat         # 啟動腳本 (Auto venv & run)
│   ├── setup_backend.bat   # 環境安裝與初始化腳本
│   └── requirements.txt    # Python 依賴清單
├── docs/                    # 專案技術文件庫
│   ├── specs/              # 系統規格定義 (API, DB Schema)
│   ├── architecture/       # 系統架構圖與設計說明
│   └── legal/              # 稅務與法規合規文件
└── README.md
```

## 實用腳本

所有後端腳本請在 `backend/` 目錄下執行：

### 資料庫管理
```bash
# 初始化資料庫表格 (backend/scripts/create_tables_script.py)
python -m scripts.create_tables_script

# 重置資料庫 (backend/scripts/reset_db.py)
python -m scripts.reset_db



### 資料填充 (Seeds)
```bash
# 填充商品與分類初始化資料
python -m app.seed_product_management

# 填充基本商品資料
python -m app.seed_products
```

### 維護工具
```bash
# 更新耗材精度 (遷移舊資料)
python -m scripts.update_material_precision

# 檢查 API 回應
python -m scripts.check_api_response
```

## 技術棧

### 前端框架
- **Next.js 16.1.6** - React 框架（App Router）
- **React 19** - UI 函式庫
- **React 19** - UI 函式庫
- **TypeScript** - 型別安全

### 後端框架
- **FastAPI** - 高效能 Python Web 框架
- **PostgreSQL** - 關聯式資料庫
- **SQLAlchemy (Async)** - ORM
- **Pydantic** - 資料驗證

### UI 組件
- **Shadcn UI** - 無障礙 UI 組件庫
- **Tailwind CSS** - 工具優先 CSS 框架
- **CSS Modules** - 模組化樣式
- **Lucide React** - 圖示庫

### 狀態管理
- **Zustand** - 輕量級狀態管理
- **Dexie.js** - IndexedDB 封裝

### 開發工具
- **ESLint** - 程式碼檢查
- **TypeScript** - 靜態型別檢查

## 文檔

詳細文檔請參考 `/docs` 目錄：

- [技術規格](docs/specs/technical-spec-v1.md)
- [資料庫架構](docs/specs/db-schema-v1.md)
- [區域網路與 PWA 設定指南](docs/LAN_PWA_SETUP.md)
- [前端設計系統](docs/specs/frontend/DESIGN_SYSTEM.md)
- [API 規範](docs/specs/frontend/API.md)

## 開發進度

- [x] 環境設置與專案初始化
- [x] 認證與 RBAC 系統
- [x] POS 收銀介面
- [x] 結帳流程與鍵盤支援
- [x] 訂單管理
- [x] 日結功能與主管授權
- [x] 後台管理頁面
- [x] 離線資料庫與同步
- [x] CSS Modules 重構
- [x] 後端架構初始化與資料庫遷移
- [x] 後端 API 整合 (Auth, Products, Orders)
- [x] 多店管理與店鋪選擇功能
- [x] 商品管理系統基礎架構 (分類、耗材、屬性)
- [x] 商品編輯與管理功能 (新增、編輯、刪除、分類管理)
- [x] 耗材管理系統 (列表、編輯、庫存數字鍵盤、低庫存警告、4位小數精度)
- [x] 商品配方與自動成本計算
- [x] 商品屬性拖放排序 (DND Support)
- [x] 後端儀表板趨勢分析與利潤統計
- [x] iPad 互動優化 (長按顯示圖表數據)
- [x] iPad 區網連線自動識別
- [x] PWA 全螢幕模式支援
- [x] 全域品牌圖示 (Branding) 整合
- [x] 管理後台 UI 布局統一化 (兩段式結構)
- [x] 全域管理頁面高效分頁 (20 筆/頁)
- [x] 報表與訂單系統日期時區修正
- [x] 報表與訂單系統日期時區修正
- [x] 報表電子預覽與 PDF 匯出 (支援 A4 列印格式)
- [x] **系統設定全自動同步 (Auto-Sync)**
- [x] **管理者身分與權限側邊欄顯示**
- [x] **登入認證安全性增強 (店鋪隔離與 PIN 碼補強)**
- [ ] 進階財務報表系統 (開發中)：
  - 營收總覽 (Gross/Net Revenue, COGS, Gross Margin)
  - 銷售結構分析 (Top Products, Category Breakdown)
  - 時段營收分析 (Hourly Analysis)
  - 支付方式與現金對帳 (Payment Breakdown, Cash Reconciliation)
- [ ] 電子發票整合 (規劃中)
- [ ] 外送平台整合 (規劃中)

## 主要功能截圖

### POS 收銀介面
- 商品目錄與分類
- 購物車即時更新
- 結帳對話框（支援鍵盤操作）

### 管理後台
- 儀表板統計
- 商品管理
- 用戶權限設定

## 鍵盤快捷鍵

### 結帳對話框
- `0-9` - 輸入數字
- `Backspace` / `Delete` - 刪除
- `C` - 清除所有輸入
- `Enter` - 確認結帳
- `Esc` - 關閉對話框

## 貢獻

歡迎提交 Issue 或 Pull Request！

## 授權

本專案採用 MIT 授權條款。
