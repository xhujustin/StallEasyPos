# StallEasy POS

StallEasy POS 是一套專為小吃攤與小型店家設計的 POS 系統，
主打 **稅務安心、離線可用、可稽核、可演進 AI**。

## Features
- POS 收銀（現金 / LINE Pay）
- 離線營運 + 同步去重
- 日結 / 鎖帳 / 更正單
- 外送整合（Foodpanda）
- 電子發票（含 2026 逾期補正指引）
- 稅務日誌 + 異常警報
- 預留 AI 進貨預測 / 永續模組

## Quick Start
請先閱讀：
- `docs/specs/technical-spec-v1.md`
- `docs/specs/db-schema-v1.md`

## Development Setup

我們提供了一鍵安裝腳本，整合了 Next.js 初始化、依賴安裝與 UI 組件配置。

```bash
# Windows
.\setup_frontend_full.bat
```

執行後將自動建立/更新 `frontend` 資料夾並安裝開發所需環境。

