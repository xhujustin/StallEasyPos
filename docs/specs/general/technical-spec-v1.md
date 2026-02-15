# 📘 Lite POS 技術文檔（Technical Specification）

**Product**: Lite POS（小吃攤 / 多店獨立）  
**Version**: v1  
**Document Type**: Engineering Technical Specification  
**Maintained by**: Core Engineering Team  

---

## 0. 技術設計總覽（Executive Summary）

Lite POS 是一套 **多店獨立、帳務可稽核、可離線營運** 的 POS 系統，專為小吃攤與高頻交易場景設計。

### 成功指標（KPI）
- 單店日交易量：**≥ 500 筆**
- 離線交易成功同步率：**≥ 99%（無資料遺失）**
- API 回應時間：**P95 < 300ms**
- 日結 / 稅務日誌：**可一鍵匯出 PDF**
- 支援單人攤主全流程操作（無專職 IT）

### 差異化
- 小吃攤級別少見的 **稅務安心設計（作廢、鎖帳、更正單、稅務日誌）**
- 內建 **輕量 AI 進貨預測與浪費警報（v2）**
- 內建 **永續 / 碳足跡估算（v2）**，支援顧客端減碳提示

---

## 1. 系統架構（System Architecture）

### 1.1 架構原則
1. **Monolith First**（v1 單體 + Worker）
2. **Event-Oriented**
3. **Store-Scoped Multi-Tenant**
4. **Audit by Design**

### 1.2 推薦技術棧（一人開發友善）
- **Backend（優先）**: **FastAPI（Python）**（事件處理與 AI/ML 整合成本最低）
- **DB**: PostgreSQL（JSONB、pgcrypto、強一致）
- **Frontend**: Flutter（iOS / Android / 平板統一）
- **Offline**: IndexedDB / SQLite + 本地 Queue
- **Event / Job**: Redis Queue（RQ / BullMQ）或 DB-based job
- **部署**: Docker + Railway / Render

---

## 2. 角色與權限模型（RBAC）

### v1 簡化策略
- Owner：預設全權（一人公司）
- Manager / Staff：僅限單店操作

### 登入與驗證（v1.5 預留）
- Phone OTP（建議）
- LINE Login（小店最順手）

---

## 3. 店鋪與使用者管理

- 店鋪僅能由 Owner 建立
- 使用者由 Owner 指派與調整
- 店員不可自行切換店鋪

---

## 4. 核心資料設計原則

- 全表包含 `created_at / updated_at`
- 禁止硬刪除，只能作廢（`is_voided` + metadata）
- 重要變更寫入 `audit_logs`

---

## 5. 訂單系統（Orders）

### 狀態機
```
draft → pending_payment → paid → completed
              ↘ cancelled / needs_review
```

### 去重原則
- 建單必帶 `idempotency_key`
- 離線回線後先做去重再落庫

---

## 6. 支付系統（Payments）

### 支援方式
- 現金
- LINE Pay v4

### LINE Pay v4 策略
- Webhook + 主動查單
- `pending_payment` > 5 分鐘 → `needs_review`
- 轉入 `needs_review` 時推播 Owner LINE

---

## 7. 日結與鎖帳（Closing）

### 流程
1. 系統計算理論現金
2. 輸入實收現金
3. 自動計算短溢

### 異常規則
- |短溢| > 500 → flag `needs_review` + 建立 adjustments

---

## 8. 更正單（Adjustments）

- 類型：increase / decrease
- 僅能新增，不可修改或刪除

---

## 9. 會員與點數

### v1
- 點數無到期
- 所有異動寫入 `points_txn`

### v1.5（到期與通知）
- 新增 `points_expiry_days`
- 到期前 **7 日** 推播 LINE：「您的 X 點即將到期」
- 到期當日再推播一次：「您的 X 點已到期並扣除」
- 到期扣除以 `points_txn` 記錄（reason=expiry）

---

## 10. 外送平台（Foodpanda）

- Adapter Pattern
- `external_order_id` 去重
- `payment_method = platform_collect`

---

## 11. LINE 商家聊天室

- 訊息顯示、模板回覆
- 顯示會員點數 / 最近訂單
- 官方 LINE QR Code

---

## 12. 發票接口（Invoice Interface）

### 狀態機
```
none → pending → issued
        ↘ failed → retry → voided
```

### 2026 新制：逾期補正機制（v1.1 起）

> ⚠️ **重要聲明**：  
> 自 2026 年起，逾期電子發票**不再由加值中心自動補傳**。  
> 本系統 **無法自動補傳逾期發票**，營業人須自行依財政部最新公告登入平台補正，  
> 否則每筆可能裁罰 **NT$1,500–15,000**。

#### 12.1 主動監測（Daily Job）
- 每日掃描 `pending / failed`
- 推播 Owner LINE：「有 X 張發票即將或可能逾期」

#### 12.2 failed > 2 日處理
- 推播 Owner：「請登入財政部平台補正」
- 自動產出：
  - **補正指引 PDF**
  - **異動申請單 CSV**

#### 12.3 補正指引 PDF（文件需求）
- 財政部電子發票整合服務平台入口：  
  https://www.einvoice.nat.gov.tw/
- 操作步驟（逐步說明）
- 常見錯誤與排查
- 本系統提供之發票資料欄位
- **技術實作**：
  - PDF 由 **Python reportlab 或 pdfkit** 產生
  - 模板預留「圖片 placeholder」（供放置財政部登入/操作截圖）

---

## 13. 離線與同步

| 功能 | 離線 |
|---|---|
| 點餐 | [V] |
| 現金 | [V] |
| 行動支付 | [X] |
| 日結 | [X] |

### 離線訂單上限
- 單店上限 **1,000 筆**
- 超過上限時：
  - App 強制顯示「請先恢復網路同步」畫面
  - 自動嘗試 sync（背景輪詢）

### 衝突解決
- 以 `created_at + idempotency_key` 為準
- 後進離線單 reject + LINE 通知 Owner

---

## 14. AI / 永續 / 稅務（V2 預留）

### 14.1 進貨預測
- Phase 1：規則引擎（雨天 + 週末 → demand * 1.3）
- Phase 2：輕量 ML（scikit-learn，30 天 orders）

### 14.2 永續 / 碳足跡
- `products.carbon_factor`
- `order_items.packaging_used`

### 14.3 稅務異常偵測
- v1.5：規則
- v2：ML（z-score / baseline）

---

## 15. 非功能需求（NFR）

### 效能
- API P95 < 300ms

### 安全性
- HTTPS（in-transit）
- PostgreSQL pgcrypto / 平台加密（at-rest）
- 密碼：bcrypt（≥8 字）
- OTP：5 分鐘有效，防重送
- **JWT**：
  - access token：15–30 分鐘
  - refresh token：7 天
- RBAC + store scope

### 監測與合規
- Sentry 錯誤追蹤
- 日誌保留 90 天
- 個資法合規

---

## 16. 版本策略（Roadmap）

| v1 | 核心 POS |
| **v1.1** | 發票逾期補正指引 + 短溢警報強化 |
| v1.5 | 稅務日誌 + 點數到期通知 |
| v2 | AI / 永續 |
