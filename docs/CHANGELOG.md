# Frontend Changelog

## 2026-02-12

### 新增功能
- 多店管理系統
  - 登入後店鋪選擇頁面
  - 顯示使用者在每個店鋪的角色(owner/manager/staff)
  - 支援單店自動跳轉,多店顯示選擇介面
  - 老闆帳號顯示「管理店鋪」按鈕
- Admin管理後台
  - 新增/admin主頁面,自動重定向至dashboard
  - 新增訂單管理頁面佔位符
  - 修改「前往POS」按鈕,跳轉至店鋪選擇頁面

### 後端API改善
- StoreOut Schema新增user_role欄位
- StoreService.get_user_stores返回使用者角色資訊
- 支援透過store_users表查詢使用者權限

### 前端狀態管理
- auth-store新增selectedStoreId狀態
- auth-store新增setSelectedStore方法
- localStorage持久化選擇的店鋪ID

### Bug修復
- 修復Next.js hydration問題
  - 店鋪選擇頁面加入mounted狀態檢查
  - 避免localStorage未載入時的錯誤跳轉
- 修復無限循環跳轉問題
  - 移除POS頁面的自動跳轉邏輯
  - 改為在登入時處理店鋪選擇

### 檔案變更
- `frontend/src/lib/store/auth-store.ts`: 新增selectedStoreId狀態管理
- `frontend/src/app/(public)/select-store/page.tsx`: 新增店鋪選擇頁面
- `frontend/src/app/(public)/login/page.tsx`: 修改登入流程
- `frontend/src/app/(admin)/admin/page.tsx`: 新增admin主頁面
- `frontend/src/app/(admin)/admin/orders/page.tsx`: 新增訂單管理頁面
- `frontend/src/app/(admin)/layout.tsx`: 修改POS連結
- `backend/app/schemas/stores.py`: 新增user_role欄位
- `backend/app/services/store_service.py`: 修改get_user_stores方法

---

## 2026-02-04

### 新增功能
- 結帳對話框 (Checkout Modal)
  - 支援實體鍵盤快捷鍵（0-9, Backspace, C, Enter, Esc）
  - 新增智慧型清除按鈕 (C)
  - 新增快速金額按鈕 ($100, $200, $500, $1000)
- 主管授權機制
  - 員工日結需主管 PIN 驗證流程
  - 獨立的主管授權對話框組件 (ManagerPinDialog)

### UI/UX 優化
- 結帳介面調整
  - 調整數字鍵盤大小與位置，優化操作重心
  - 關閉按鈕增加背景色，提升視覺辨識度
  - 增加按鈕點擊動畫與轉場效果
- 日結頁面調整
  - 更新圖示與佈局，標題上下間距對稱
  - 優化警告訊息樣式，採用 AlertCircle 統一風格

### Bug 修復
- 路由與導航
  - 修復點擊結帳按鈕導致的 404 錯誤
  - 將複雜的 Parallel Routes 降級為 State-based Modal 以提升穩定性
- 渲染與效能
  - 解決 POS 頁面 Hydration 錯誤，確保 SSR 與 CSR 數據一致
  - 修正 IndexedDB 查詢條件中的布林值邏輯
- 易用性與無障礙
  - 修復 DialogContent 缺失 DialogTitle 的無障礙警告

### 架構與重構
- 樣式模組化
  - 完成 POS、登入與管理頁面的 CSS Modules 重構
  - 消除 Tailwind @apply 導致的編譯警告
- 路由安全性
  - 優化 proxy.ts 角色存取規則 (RBAC)

### 檔案路徑分類清單

#### 組件開發 (frontend/src/components)
- `pos/checkout-modal.tsx`: 新增。核心結帳組件，整合鍵盤快捷鍵。
- `pos/manager-pin-dialog.tsx`: 新增。可重用主管授權 PIN 碼對話框。
- `ui/dialog.tsx`: 修改。添加無障礙標題支援並修正樣式。

#### 路由與頁面 (frontend/src/app)
- `(pos)/pos/page.tsx`: 修改。串接結帳 Modal，修正客戶端渲染衝突。
- `(pos)/pos/closing/page.tsx`: 修改。優化 UI 間距與日結授權流程。
- `(pos)/pos/layout.tsx`: 新增。支援 Parallel Routes 的基礎佈局。
- `(pos)/layout.tsx`: 修改。側邊欄圖示與全域 UI 調整。
- `(public)/login/page.tsx`: 修改。整合 CSS Modules 樣式。
- `proxy.ts`: 修改。更新 RBAC 角色路徑存取邏輯。

#### 樣式系統 (frontend/src/app/**/*.module.css)
- `(pos)/layout.module.css`: 新增。POS 系統佈局模組化樣式。
- `(public)/login/page.module.css`: 新增。登入頁面專用模組化樣式。
- `(admin)/layout.module.css`: 新增。管理後台 Layout 模組化樣式。

#### 設定與文檔 (root & docs)
- `README.md`: 完整重構。移除圖示，強化架構說明。
- `docs/CHANGELOG.md`: 新增。記錄專案演進與分類清單。
- `docs/DEVELOPMENT.md`: 新增。開發者環境配置與架構圖解。
- `frontend/next.config.ts`: 修改。移除 Next.js 16 警告配置。
- `.gitignore`: 修改。優化開發環境過濾規則。

---

## 專案進度清單

### 已完成
- [x] 環境設置與專案初始化
- [x] 認證與 RBAC 系統
- [x] POS 收銀介面與核心邏輯
- [x] 鍵盤操作支援
- [x] 訂單管理基本功能
- [x] 主管授權流程
- [x] 離線資料庫與自動同步服務
- [x] 專案樣式重構與文件化

### 進行中
- [ ] 服務端 API 整合
- [ ] 電子發票流程對接
- [ ] 第三方外送平台整合

### 規劃中
- [ ] LINE Pay 整合支付
- [ ] 進階數據報表匯出
- [ ] 庫存預警系統
- [ ] AI 銷售預測模組
