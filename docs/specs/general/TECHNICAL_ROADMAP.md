# 技術發展路線圖 (Technical Roadmap)

**文件版本**: v1.0  
**更新日期**: 2026-02-04

---

## 1. 階段規劃總覽

本專案將技術發展劃分為四個主要階段，採取 **"先求穩，再求快，後求智"** 的演進策略。

| 階段 | 版本 | 核心目標 | 關鍵技術投入 | 預計週期 |
|---|---|---|---|---|
| **Phase 1** | v1.0 | **核心 POS 功能 (MVP)** | Monolith, FastAPI, PostgreSQL | Q1 2026 |
| **Phase 2** | v1.1 | **稅務合規與運營優化** | PDF Generation, Job Queue | Q2 2026 |
| **Phase 3** | v1.5 | **離線韌性與效能** | IndexedDB, PWA, Sync Protocol | Q3 2026 |
| **Phase 4** | v2.0 | **AI 賦能與永續** | ML Pipeline, Data Warehouse | Q4 2026+ |

---

## 2. 詳細里程碑

### Phase 1: 核心 POS 基石 (The Foundation)
**目標**: 完成單店、連網狀態下的基礎收銀與帳務功能。

- **後端架構**: 建立 Modular Monolith 架構，區分 `Order`, `Product`, `User` 模組。
- **資料庫**: 設計高一致性的關聯式資料庫 (PostgreSQL)，確保金額計算零誤差。
- **API**: 完成 RESTful API 定義與 Swagger 文件自動化。
- **前端**: 完成 Flutter / React 基礎 UI Component Library。
- **支付**: 整合 LINE Pay v4 API。

### Phase 2: 稅務合規 (Compliance First)
**目標**: 針對 2026 電子發票新制，強化異常處理與自動化報告。

- **電子發票整合**: 
  - 實作 Turnkey 傳輸或加值中心 API 串接。
  - 建立「逾期補正」自動偵測 Job。
- **文件生成服務**:
  - 整合 `ReportLab` 或 `WeasyPrint`，支援後端生成 PDF (日結單、補正指引)。
- **背景任務**:
  - 引入 `Redis Queue (RQ)` 或 `Celery` 處理非同步任務 (如：每日結算報表發送)。

### Phase 3: 離線優先與韌性 (Offline-First)
**目標**: 解決小吃攤網路不穩痛點，確保斷網仍可營運。

- **本地資料庫**: 前端引入 `IndexedDB` (Web) 或 `SQLite` (App) 快取商品與訂單資料。
- **同步協定 (Sync Protocol)**:
  - 設計 `Delta Sync` 機制，僅傳輸變更資料。
  - 實作「衝突解決策略」(Conflict Resolution)，以 Server 時間戳與 idempotency_key 為準。
- **快取層**: 引入 Redis 快取熱點資料 (如：熱銷排行、基礎設定)。

### Phase 4: 智慧轉型 (Intelligence & Sustainability)
**目標**: 透過數據創造額外價值，導入 AI 預測與 ESG 元素。

- **資料倉儲 (Data Warehouse)**:
  - 建立 ETL 流程，將歷史訂單轉入分析型資料庫 (如 BigQuery 或 ClickHouse)。
  - 進行資料去識別化處理。
- **AI 預測模組**:
  - 訓練銷售預測模型 (Time Series Forecasting)，考量天氣、假日等特徵。
  - 產出「建議進貨量」API。
- **碳足跡計算**:
  - 建立食材碳排放係數表。
  - 每筆訂單即時計算碳排放量，並顯示於收據或顧客端 App。

---

## 3. 技術債管理策略

- **測試覆蓋率**: Core Logic 需維持 > 80% 單元測試覆蓋率。
- **依賴更新**: 每月執行一次 Dependency Audit，修補資安漏洞。
- **架構重構**: 預計於 v1.5 前進行一次大規模 Code Review，評估是否需將部分高負載模組 (如訂單處理) 拆分為 Microservice (目前傾向保持 Monolith 直到單店日單量 > 5000)。
