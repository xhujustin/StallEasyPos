## 2026-02-16 (深夜) - 系統設定智美升級、安全性補強與 UI 優化

### 新增功能 - 系統設定 (Admin Settings) 智美升級
- [x] **報表美學同步**：系統設定介面全面改版。導入極簡的小標籤設計 (`text-[10px]`) 與寬字距排版，與報表模組美學完美對齊。
- [x] **全自動同步模式 (Auto-Sync)**：移除繁瑣的手動儲存按鈕。實現防抖動 (Debounce) 自動儲存，變更後 1 秒內自動同步雲端，操作如 Google Docs 般流暢。
- [x] **動態狀態顯示**：Header 新增智慧同步狀態列，成功同步後 2 秒自動隱藏，維持介面純淨且反饋清晰。

### 安全性補強 - 登入認證防護
- [x] **嚴格店鋪隔離 (Vulnerability Fix)**：修復跨店鋪登錄安全漏洞。現在當使用「店鋪帳號」模式登入時，驗證邏輯會硬性鎖定在該店舖內，徹底阻斷持無關店鋪 PIN 碼或個人密碼非法跳過驗證的路徑。
- [x] **Owner 身分對應修正**：修正 Owner 在店鋪模式下無法驗證 PIN 碼的漏洞，確保管理者能在所擁有的店舖中快速切換與登入。

### UI/UX 優化 - 管理側邊欄 (Sidebar)
- [x] **操作人身分透明化**：在「前往 POS」按鈕上方新增「操作人」與「身分權限」資訊。
- [x] **身分標籤系統**：導入金色橢圓標籤動態區分「全域管理員」、「店鋪負責人」與「店員」，資訊階層更分明。
- [x] **滿版切齊視覺**：優化分隔線樣式，使其完美橫跨側邊欄與兩側切齊，視覺更具結構感。

---

## 2026-02-16 (晚間) - 報表系統重大升級 (v1.2.0-alpha)

### 新增功能 - 進階財務報表系統 (規劃與實作中)
- [x] **報表架構重構**
  - [x] 遷移至獨立頁面 (`/admin/reports/print`)，解決 Modal 預覽空間不足問題。
  - [x] 導入 `Suspense` 邊界處理與 `router.push` 轉場，消除頁面閃爍。
- [ ] **全方位營運分析 (依據新規範)**
  - **營收總覽**：淨營收、毛利、客單價 (AOV) 自動計算。
  - **銷售結構**：商品分類占比、熱銷商品排行。
  - **時段分析**：每小時營收熱點分析 (排班輔助)。
  - **現金對帳**：開班/結班/短溢 (Shortage) 自動稽核。
  - **支付分析**：現金/多元支付/外送平台拆帳統計。

### 改進與修復
- [x] **報表列印優化**
  - 修正 PDF 匯出空白問題。
  - 實作「所見即所得」的列印樣式 (Print Portal)。
  - 支援 A4 格式完美輸出。

---

## 2026-02-16 - 管理介面 UI 統一化、分頁與報表優化

### 新增功能 - 管理系統全域優化
- [x] **後台 UI 布局統一化 (Layout Alignment)**
  - 導入「標題區 + 獨立過濾卡片」的兩段式佈局，對齊「商品管理」視覺語言。
  - 統一「報表分析」與「訂單管理」的 Header 樣式。
- [x] **全域高效分頁 (Pagination)**
  - 管理列表（報表、訂單）預設顯示每頁 20 筆，提升載入速度與瀏覽體驗。
- [x] **智能過濾體驗 (Smart Filtering)**
  - 移除手動搜尋按鈕，支援「即時輸入自動過濾」。
  - 修正時區日期邏輯：改用本地時間初始化，解決跨日後預設日期為「昨天」的問題。

### 改進與修復
- [x] **報表分析頁面**
  - 合併「班次 ID」與「狀態」列，優化表格緊湊度。
  - 對接後端 `start_date` / `end_date` API 支持。

---

## 2026-02-15 - 儀表板趨勢分析、利潤統計與 PAD 互動優化

### 新增功能 - 儀表板 (Dashboard)
- [x] **營收趨勢分析**
  - 支援動態時間範圍：7天、30天、6個月、1年
  - 自動切換彙總層級：30天內以「日」統計，超過則以「月」統計
  - 解決長天數查詢時的 SQL Grouping Error (500 錯誤)
- [x] **利潤與客單價計算**
  - 整合商品成本 (Cost)，即時計算「淨利 = 營收 - 成本」
  - 計算平均客單價 (AOV)
- [x] **互動 UI 優化 (iPad 友善)**
  - 支援「按住顯示」：iPad/平板用戶按住柱狀圖可顯示詳細資訊，放開後消失
  - 動態工具提示 (Tooltip)：顯示營收、淨利、訂單數、平均單價
  - 版面改良：解決日期標籤在資料較多時的重疊問題，增加圖表預留高度

### 改進與修復
- [x] **POS 系統**
  - 訂單編號格式優化：改為每日重新計數之流水號 (1, 2, 3...)
  - 結帳流程異常修復 (422 Error)
  - 全域 401/Session 過期自動跳轉登入頁
- [x] **管理後台**
  - 商品屬性排序 (DND) 功能完備
  - 修復商品刪除失敗與屬性遺失問題

### 檔案變更
**前端**:
- `frontend/src/app/(admin)/admin/dashboard/page.tsx`
- `frontend/src/lib/api/dashboard.ts`
- `frontend/src/lib/api/client.ts`

**後端**:
- `backend/app/services/dashboard_service.py`
- `backend/app/schemas/dashboard.py`
- `backend/app/api/v1/endpoints/dashboard.py`

---

## 2026-02-13 (下午) - 耗材管理系統基礎完成 & 商品管理功能完善

### 新增功能 - 耗材管理
- [x] 耗材管理頁面 (`/admin/materials`)
  - 耗材列表顯示與搜尋
  - 新增/編輯/刪除耗材
  - 低庫存警告標示
- [x] 數字鍵盤庫存更新功能
  - 支援設定、增加、減少三種模式
  - 自動計算預覽結果
- [x] 導航欄整合
  - 添加「耗材管理」至左側選單

### 待修復問題 (耗材管理)
- [Bug] 庫存更新「增加」模式報錯 (422 Error)
- [Bug] 編輯對話框欄位未正確預填
- [Bug] 刪除按鈕無反應

### 新增功能 - 商品管理
- [x] 商品編輯頁面 (`/admin/products/[id]/edit`)
- [x] 商品刪除功能
- [x] 修復HTTP方法不匹配(PUT->PATCH)
- [x] 允許停用商品顯示于管理後台

### 檔案變更
**前端**:
- `frontend/src/app/(admin)/admin/materials/page.tsx`
- `frontend/src/lib/api/materials.ts`
- `frontend/src/app/(admin)/layout.tsx`

**後端**:
- `backend/app/services/product_service.py` (新增get/delete方法)
- `backend/app/api/v1/endpoints/products.py` (新增GET/DELETE端點)

---

## 2026-02-13

### 新增功能 - 商品管理系統
- **資料庫設計**
  - 新增7個資料表：categories(分類)、materials(耗材)、product_attributes(商品屬性)、product_attribute_options(屬性選項)、option_materials(選項耗材關聯)、store_settings(店鋪設定)
  - products表新增image_url欄位,移除舊的attributes JSON欄位
  - 支援複雜的商品屬性和耗材管理系統

- **後端API**
  - Categories API：完整的分類CRUD操作
  - Materials API：耗材管理、庫存更新、低庫存查詢
  - 建立CategoryService和MaterialService
  - API測試驗證通過,正確處理中文字元

- **前端實作**
  - 商品管理主頁面：商品列表、搜尋、分類篩選、狀態篩選
  - API客戶端：categories.ts、materials.ts (TypeScript型別安全)
  - 管理分類按鈕、新增商品按鈕

- **Admin Layout改進**
  - 新增店鋪下拉選單：直接在導航欄切換店鋪
  - 顯示當前店鋪資訊
  - 優化UI：移除「切換店鋪」按鈕,簡化介面
  - 標籤樣式改進：黑色粗體、適當間距

### Bug修復
- 修復商品管理頁面跳轉問題
  - 加入mounted狀態檢查避免hydration問題
  - 修復API調用方法名稱(getProducts → getAll)
- 修復「管理店鋪」按鈕邏輯
  - 未選擇店鋪時自動選擇第一個店鋪
  - 避免進入管理後台時selectedStoreId為null

### 測試資料
- 建立seed_product_management.py腳本
  - 3個分類：飲料、小吃、主食
  - 9種耗材：茶葉、珍珠、杯子(大/中/小)、冰塊、糖、雞排、薯條

### 檔案變更
**後端**:
- `backend/migrations/versions/002_product_management.py`: 新增資料庫遷移
- `backend/app/models/category.py`: 新增
- `backend/app/models/material.py`: 新增
- `backend/app/models/product_attribute.py`: 新增
- `backend/app/models/store_setting.py`: 新增
- `backend/app/models/product.py`: 修改(新增image_url)
- `backend/app/schemas/categories.py`: 新增
- `backend/app/schemas/materials.py`: 新增
- `backend/app/schemas/product_attributes.py`: 新增
- `backend/app/schemas/products.py`: 修改
- `backend/app/services/category_service.py`: 新增
- `backend/app/services/material_service.py`: 新增
- `backend/app/api/v1/endpoints/categories.py`: 新增
- `backend/app/api/v1/endpoints/materials.py`: 新增
- `backend/app/api/v1/api.py`: 修改(註冊新路由)
- `backend/app/seed_product_management.py`: 新增
- `backend/migrate_db.bat`: 新增

**前端**:
- `frontend/src/lib/api/categories.ts`: 新增
- `frontend/src/lib/api/materials.ts`: 新增
- `frontend/src/app/(admin)/admin/products/page.tsx`: 修改
- `frontend/src/app/(admin)/layout.tsx`: 修改(店鋪下拉選單)
- `frontend/src/app/(admin)/layout.module.css`: 修改
- `frontend/src/app/(public)/select-store/page.tsx`: 修改(管理店鋪按鈕邏輯)

---

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
