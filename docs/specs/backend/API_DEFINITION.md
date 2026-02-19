# API 介面定義與開發規範 (API Definition)

**文件版本**: v1.0  
**更新日期**: 2026-02-05  
**適用範圍**: 後端開發團隊、前端開發團隊、第三方整合夥伴

---

## 1. 協議概要 (Protocol Overview)

本系統採用 RESTful 風格設計 API，並基於 **FastAPI** 框架實作。

- **通訊協議**: HTTPS (TLS 1.2+)
- **資料格式**: `application/json` (請求與回應)
- **字元編碼**: UTF-8
- **時間格式**: ISO 8601 (UTC), 例如: `2026-02-04T14:30:00Z`
- **基礎路徑**: `/api/v1`

---

## 2. 請求結構 (Request Structure)

### 2.1 標頭 (Headers)

| 標頭名稱 | 必填 | 說明 | 範例 |
|---|---|---|---|
| `Content-Type` | 是 | 指定請求內容格式 | `application/json` |
| `Authorization` | 否 | JWT 認證憑證 (登入後 endpoints 必填) | `Bearer <token>` |
| `X-Request-ID` | 否 | 請求追蹤 ID (若未提供則由系統生成) | `req_12345678` |

### 2.2 查詢參數 (Query Parameters)
- 列表篩選必須使用小寫蛇形命名 (snake_case)，例如: `store_id`, `date_from`。
- 分頁參數標準化: `page` (預設 1), `size` (預設 20)。

---

## 3. 回應結構 (Response Structure)

所有 API 回應皆需封裝於統一結構中，以確保前端處理的一致性。

### 3.1 成功回應 (Success Response)
HTTP Status Code: `200 OK` or `201 Created`

```json
{
  "code": 0,
  "message": "success",
  "data": {
    // 業務資料物件或陣列
  },
  "meta": {
    // metadata, 例如分頁資訊 (選填)
    "total": 100,
    "page": 1,
    "size": 20
  }
}
```

### 3.2 錯誤回應 (Error Response)
HTTP Status Code: `4xx` or `5xx`

```json
{
  "code": 4001,           // 業務錯誤代碼 (詳見 ERROR_CODES.md)
  "message": "無效的參數", // 開發者友好的除錯訊息
  "details": [            // 詳細欄位錯誤 (選填)
    {
      "field": "email",
      "issue": "invalid_format"
    }
  ]
}
```

---

## 4. FastAPI 開發規範 (FastAPI Implementation Guidelines)

為確保程式碼品質與維護性，所有 API 開發須遵循以下規範：

### 4.1 Pydantic 模型 (Models)
- **Request Models**: 命名後綴為 `Create` 或 `Update`，例如 `UserCreate`, `OrderUpdate`。
- **Response Models**: 命名後綴為 `Out` 或 `Response`，例如 `UserOut`。
- 必須使用 Type Hints 嚴格定義型別。

### 4.2 相依注入 (Dependency Injection)
- **資料庫連線**: 使用 `Depends(get_db)` 獲取 Session。
- **當前使用者**: 使用 `Depends(get_current_user)` 獲取 `User` 物件。

### 4.3 路由組織 (Router Organization)
- `app/api/endpoints/` 下按資源分類，例如 `orders.py`, `products.py`。
- `main.py` 統一匯入並註冊路由，需設定 Tags 以利 Swagger UI 分類。

### 4.4 異常處理 (Exception Handling)
- 禁止在 API 邏輯中直接拋出 `HTTPException(500)`，應捕捉特定異常並轉換為自定義業務異常。
- 使用全域 Exception Handler 統一格式化錯誤回應。

---

## 5. 介面文件 (API Documentation)

- **Swagger UI**: `/docs` (開發環境預設開啟，生產環境需權限控管)
- **ReDoc**: `/redoc`
- 每個 Endpoint 必須包含:
  - `summary`: 簡短說明
  - `description`: 詳細邏輯描述
  - `response_model`: 定義回應結構

---

## 6. 版本控制 (Versioning)
- URL 版本號: `/api/v1/...`
- 重大變更 (Breaking Changes) 需發布 v2，並保留 v1 相容性至少 3 個月。

---

## 7. 已實現介面 (Implemented Endpoints)

### 7.1 認證 (Auth)
- `POST /auth/login`: 使用者登入並獲取 Access Token (OAuth2 格式)。
- `POST /auth/register`: 註冊新使用者。
- `PUT /users/me/profile`: 使用者自訂個人資料與 PIN 碼。變更 PIN 碼時需傳入 `old_pin` 欄位進行安全性驗證。

### 7.2 商品 (Products)
- `GET /products/?store_id={id}`: 取得特定店鋪的所有商品。支援分類與狀態篩選。
- `POST /products/`: 建立新商品。
- `PATCH /products/{id}`: 更新商品資訊。
- `POST /products/upload-image`: 上傳商品圖片。支援 `old_url` 參數以實作伺服器端自動清理舊圖。

### 7.3 訂單 (Orders)
- `POST /orders/`: 建立新訂單。支援 **Idempotency Key** 以防止重複提交。
- `GET /orders/`: 取得訂單列表。

### 7.4 店鋪 (Stores)
- `GET /stores/`: 取得當前使用者所屬的店鋪列表。
- `POST /stores/`: 建立新店鋪。

