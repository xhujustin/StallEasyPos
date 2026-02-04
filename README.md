# StallEasy POS

StallEasy POS 是一套專為小吃攤與小型店家設計的 POS 系統，
主打 **稅務安心、離線可用、可稽核、可演進 AI**。

## 核心特色

### POS 收銀系統
- **多種支付方式**：現金、LINE Pay（規劃中）
- **智能鍵盤**：支援實體鍵盤快捷鍵操作
- **快速金額**：常用金額快速選擇
- **離線營運**：無網路也能正常收銀

### 權限管理 (RBAC)
- **三種角色**：員工 (Staff)、主管 (Manager)、老闆 (Owner)
- **主管授權**：員工日結需主管 PIN 驗證
- **路由保護**：基於角色的頁面訪問控制

### 管理功能
- **日結報表**：每日營收統計與結算
- **訂單管理**：查看、作廢、補印訂單
- **商品管理**：新增、編輯、分類商品
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
cd backend
.\backend.bat
```

訪問 http://localhost:3000 開始使用

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
│   │   │   ├── (public)/   # 公開頁面（登入）
│   │   │   ├── (pos)/      # POS 收銀系統
│   │   │   └── (admin)/    # 後台管理
│   │   ├── components/      # React 組件
│   │   │   ├── ui/         # Shadcn UI 基礎組件
│   │   │   └── pos/        # POS 專用組件
│   │   ├── lib/            # 工具函數與狀態管理
│   │   │   ├── store/      # Zustand 狀態
│   │   │   ├── db/         # IndexedDB 離線資料庫
│   │   │   └── sync/       # 同步服務
│   │   └── proxy.ts        # 認證與 RBAC 中介層
│   └── package.json
├── docs/                    # 專案文檔
│   ├── specs/              # 技術規格
│   ├── architecture/       # 架構設計
│   └── legal/              # 法規文件
├── backend/                # FastAPI 後端應用
│   ├── app/                # 應用程式碼
│   ├── backend.bat         # 啟動腳本
│   └── requirements.txt    # Python 依賴
└── README.md
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
- [前端設計系統](docs/specs/frontend/DESIGN_SYSTEM.md)
- [API 規範](docs/specs/frontend/API.md)

## 開發進度

- ✅ 環境設置與專案初始化
- ✅ 認證與 RBAC 系統
- ✅ POS 收銀介面
- ✅ 結帳流程與鍵盤支援
- ✅ 訂單管理
- ✅ 日結功能與主管授權
- ✅ 後台管理頁面
- ✅ 離線資料庫與同步
- ✅ CSS Modules 重構
- ✅ CSS Modules 重構
- ✅ 後端架構初始化
- 🔄 後端 API 整合（進行中）
- ⏳ 電子發票整合
- ⏳ 外送平台整合

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
