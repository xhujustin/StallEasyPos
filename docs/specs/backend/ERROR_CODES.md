# Webserver 錯誤代碼標準 (Error Codes)

**文件版本**: v1.0  
**更新日期**: 2026-02-04

---

## 1. 錯誤代碼區段規劃

| 代碼區間 | 定義 | HTTP 對應 | 說明 |
|---|---|---|---|
| **0** | **Success** | 200/201 | 操作成功 |
| **1000 - 1999** | **系統通用錯誤** | 400/500 | 參數錯誤、資料庫異常、系統未知錯誤 |
| **2000 - 2999** | **認證與授權** | 401/403 | Token 無效、權限不足 |
| **3000 - 3999** | **業務邏輯錯誤** | 400/422 | 訂單狀態異常、庫存不足、金額不符 |
| **4000 - 4999** | **外部服務錯誤** | 502/504 | LINE Pay 失敗、發票平台連線逾時 |

---

## 2. 詳細代碼定義

### 1xxx 系統通用錯誤 (General System Errors)

| 代碼 | 錯誤訊息 (Key) | 說明 |
|---|---|---|
| `1000` | `INTERNAL_SERVER_ERROR` | 系統內部發生未預期的錯誤，請聯繫管理員 (已實作全域攔截確保回傳 CORS Header) |
| `1001` | `INVALID_PARAMETERS` | 請求參數格式錯誤或缺少必填欄位 |
| `1002` | `RESOURCE_NOT_FOUND` | 請求的資源不存在 (ID 無效) |
| `1003` | `METHOD_NOT_ALLOWED` | 該資源不支援此 HTTP 方法 |
| `1004` | `DB_OPERATION_FAILED` | 資料庫寫入或讀取失敗 |
| `1005` | `DB_SYNC_ERROR` | 資料庫架構與程式碼不同步 (啟動時檢查) |

### 2xxx 認證與授權 (Auth Errors)

| 代碼 | 錯誤訊息 (Key) | 說明 |
|---|---|---|
| `2000` | `AUTH_REQUIRED` | 需要登入才能存取 |
| `2001` | `TOKEN_INVALID` | 存取憑證無效或格式錯誤 |
| `2002` | `TOKEN_EXPIRED` | 存取憑證已過期 |
| `2003` | `PERMISSION_DENIED` | 權限不足 (例如: 店員嘗試操作 Owner 功能) |
| `2004` | `ACCOUNT_LOCKED` | 帳號已被鎖定或停用 |

### 3xxx 業務邏輯錯誤 (Business Logic Errors)

| 代碼 | 錯誤訊息 (Key) | 說明 |
|---|---|---|
| `3001` | `ORDER_STATUS_INVALID` | 訂單狀態不允許此操作 (例: 已完成訂單不可取消) |
| `3002` | `PRODUCT_OUT_OF_STOCK` | 商品庫存不足 |
| `3003` | `PAYMENT_AMOUNT_MISMATCH` | 支付金額與訂單金額不符 |
| `3004` | `STORE_CLOSED` | 目前不在營業時間內 |
| `3005` | `DUPLICATE_OPERATION` | 重複的操作請求 (Idempotency Check Fail) |
| `3006` | `DAILY_CLOSE_FINISHED` | 今日已執行過日結，不可再新增交易 |

### 4xxx 外部整合錯誤 (External Integration Errors)

| 代碼 | 錯誤訊息 (Key) | 說明 |
|---|---|---|
| `4001` | `LINE_PAY_ERROR` | LINE Pay 交易初始化或確認失敗 |
| `4002` | `EINVOICE_PLATFORM_ERROR` | 財政部電子發票平台回應錯誤 |
| `4003` | `EINVOICE_TIMEOUT` | 電子發票平台連線逾時 |
| `4004` | `PRINTER_CONNECTION_ERROR` | 出單機連線失敗 |

---

## 3. 實作指引

後端程式碼應定義 Enum 對應上述代碼，確保全域一致性。

**Python 範例**:
```python
from enum import Enum

class ErrorCode(int, Enum):
    SUCCESS = 0
    INTERNAL_ERROR = 1000
    INVALID_PARAMS = 1001
    # ...
```
