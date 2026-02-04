# 資安技術架構規範 (Security Architecture)

**文件版本**: v1.0  
**更新日期**: 2026-02-04

---

## 1. 資安設計原則 (Security by Design)

本系統遵循 **"縱深防禦 (Defense in Depth)"** 原則，從應用層、資料層到基礎設施層皆設有防護機制，並特別針對 POS 系統涉及的金流與個資進行強化。

---

## 2. 應用層安全 (Application Layer)

### 2.1 身份認證 (Authentication)
- **Token 機制**: 採用標準 JWT (JSON Web Tokens)。
  - `Access Token`: 有效期 15 分鐘，用於短期存取。
  - `Refresh Token`: 有效期 7 天，用於換發 Access Token，並支援伺服器端撤銷 (Revocation)。
- **密碼管理**:
  - 禁止以明碼儲存密碼。
  - 強制使用 **Bcrypt** 或 **Argon2** 進行雜湊加密 (Hash)。
  - 密碼強度規範: 至少 8 碼，混合大小寫字母與數字。
- **多因子認證 (MFA)**: 管理員帳號 (Owner) 建議啟用 OTP 驗證 (規劃中)。

### 2.2 存取控制 (Authorization)
- **RBAC 模型**: 基於角色的存取控制 (Role-Based Access Control)。
  - `Owner`: 擁有完整權限 (包含退款、作廢、查看報表)。
  - `Manager`: 店務管理 (商品上下架、庫存盤點)。
  - `Staff`: 僅限點餐與結帳，無法刪除訂單。
- **店鋪隔離 (Store Isolation)**: API 層級強制檢查 `store_id`，防止跨店資料存取 (IDOR 防護)。

### 2.3 輸入驗證 (Input Validation)
- 所有 API 輸入參數皆須通過 **Pydantic Model** 嚴格驗證。
- 防止 SQL Injection: 全面使用 ORM (SQLAlchemy/Tortoise) 參數化查詢，禁止字串串接 SQL。
- 防止 XSS: 前端框架 (React/Flutter) 預設跳脫輸出，後端對 HTML 內容進行 Sanitize。

---

## 3. 資料層安全 (Data Layer)

### 3.1 加密儲存 (Encryption At Rest)
- **機敏欄位**: 會員個資 (手機、Email)、電子發票金鑰等，須使用 AES-256 或資料庫內建加密函數 (如 PostgreSQL `pgcrypto`) 儲存。
- **備份加密**: 資料庫備份檔須加密後上傳至異地儲存 (如 AWS S3)。

### 3.2 稽核軌跡 (Audit Logging)
- 關鍵操作 (登入、作廢訂單、退款、修改價格) 必須寫入 `audit_logs` 資料表。
- 稽核紀錄包含: `user_id`, `action`, `resource_id`, `timestamp`, `ip_address`, `changes` (變更前後值)。
- 稽核紀錄禁止物理刪除 (Hard Delete)。

---

## 4. 傳輸層安全 (Transport Layer)

- **HTTPS 強制**: 所有通訊全程採用 TLS 1.2 或以上版本加密。
- **HSTS**: 啟用 HTTP Strict Transport Security，強制瀏覽器使用 HTTPS。
- **CORS 策略**: 嚴格限制 `Access-Control-Allow-Origin` 僅允許信任的前端網域。

---

## 5. 基礎設施與運維 (Infrastructure & DevOps)

- **網路防火牆 (WAF)**: 部署 WAF 過濾惡意流量 (如 DDOS, SQL Injection 掃描)。
- **Rate Limiting**: API Gateway 設定速率限制 (例如單 IP 每分鐘 60 次)，防止暴力破解與濫用。
- **漏洞掃描**: CI/CD 流程整合靜態程式碼分析 (SAST) 與依賴套件弱點掃描 (Dependency Check)。
- **機密管理**: API Key、DB 密碼等敏感設定，禁止寫入 Git code repository，須透過環境變數 (Environment Variables) 或 Secret Manager 注入。

---

## 6. 合規性 (Compliance)

- **隱私權政策**: 系統設計符合個資法 (PDPA) 要求，提供使用者「被遺忘權」(資料匿名化) 實作機制。
- **財政部規範**: 電子發票模組符合資訊安全檢測規範。
