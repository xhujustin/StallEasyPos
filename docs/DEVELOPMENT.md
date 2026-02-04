# 開發指南

## 快速開始

### 1. 環境需求
- Node.js 18+ 
- npm 或 yarn
- Git

### 2. 安裝步驟

```bash
# Clone 專案
git clone <repository-url>
cd StallEasyPos-V1.0.0

# 進入前端目錄
cd frontend

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

### 3. 訪問應用
開啟瀏覽器訪問 http://localhost:3000

### 4. 登入測試

| 角色 | PIN | 可訪問頁面 |
|------|-----|-----------|
| 老闆 (Owner) | 0000 | 全部 |
| 主管 (Manager) | 1111 | POS + 部分後台 |
| 員工 (Staff) | 2222 | POS（日結需授權） |

## 專案結構說明

### 前端架構
```
frontend/src/
├── app/                    # Next.js App Router
│   ├── (public)/          # 公開路由（登入）
│   ├── (pos)/             # POS 系統
│   │   ├── layout.tsx     # POS 共用 layout
│   │   └── pos/           # POS 頁面
│   │       ├── page.tsx           # 收銀主頁
│   │       ├── orders/            # 訂單列表
│   │       ├── closing/           # 日結
│   │       └── settings/          # 設定
│   └── (admin)/           # 後台管理
│       ├── layout.tsx     # Admin 共用 layout
│       └── admin/         # Admin 頁面
│           ├── dashboard/         # 儀表板
│           ├── products/          # 商品管理
│           ├── users/             # 用戶管理
│           └── settings/          # 系統設定
├── components/            # React 組件
│   ├── ui/               # Shadcn UI 基礎組件
│   └── pos/              # POS 專用組件
│       ├── checkout-modal.tsx     # 結帳對話框
│       ├── manager-pin-dialog.tsx # 主管授權
│       └── sync-indicator.tsx     # 同步指示器
├── lib/                  # 工具與狀態
│   ├── store/           # Zustand 狀態管理
│   │   ├── cart-store.ts         # 購物車
│   │   └── auth-store.ts         # 認證
│   ├── db/              # IndexedDB
│   │   └── offline-db.ts         # 離線資料庫
│   ├── sync/            # 同步服務
│   │   └── sync-service.ts       # 自動同步
│   └── api/             # API 相關
│       └── mock-data.ts          # 模擬資料
└── proxy.ts             # 認證與 RBAC 中介層
```

## 開發工作流程

### 1. 新增頁面
```bash
# 在適當的 route group 中創建
frontend/src/app/(pos)/pos/new-page/page.tsx
```

### 2. 新增組件
```bash
# UI 組件
frontend/src/components/ui/new-component.tsx

# 功能組件
frontend/src/components/pos/new-feature.tsx
```

### 3. 狀態管理
```typescript
// 使用 Zustand
import { create } from 'zustand';

export const useMyStore = create((set) => ({
  data: null,
  setData: (data) => set({ data }),
}));
```

### 4. 樣式管理
```typescript
// 使用 CSS Modules
import styles from './component.module.css';

export function Component() {
  return <div className={styles.container}>...</div>;
}
```

## 常用指令

```bash
# 開發
npm run dev

# 建置
npm run build

# 啟動生產版本
npm start

# Lint 檢查
npm run lint

# 型別檢查
npm run type-check
```

## 除錯技巧

### 1. React DevTools
安裝 React DevTools 瀏覽器擴充功能

### 2. 查看狀態
```typescript
// Zustand DevTools
import { devtools } from 'zustand/middleware';

export const useStore = create(
  devtools((set) => ({...}))
);
```

### 3. 查看 IndexedDB
- Chrome DevTools > Application > IndexedDB

### 4. 網路請求
- Chrome DevTools > Network

## 常見問題

### Q: 登入後跳轉錯誤？
A: 檢查 `proxy.ts` 中的路由規則和角色權限

### Q: 購物車狀態丟失？
A: Zustand store 預設不持久化，需要使用 persist middleware

### Q: 離線資料未同步？
A: 檢查 `sync-service.ts` 和瀏覽器 console 日誌

### Q: CSS 樣式不生效？
A: 確認 CSS Modules 檔名為 `.module.css`

## 貢獻指南

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 程式碼規範

- 使用 TypeScript
- 遵循 ESLint 規則
- 組件使用 PascalCase
- 檔案使用 kebab-case
- 使用 CSS Modules 而非 inline styles
