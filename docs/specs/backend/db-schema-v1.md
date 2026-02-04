# Database Schema v1

> 本文件定義 StallEasy POS v1 所有資料表、索引、唯一鍵與去重設計。
> 基於 PostgreSQL 商用級架構。

## 1. Enums & Types

| Type Name | Values |
|---|---|
| `user_role` | owner, manager, staff |
| `order_source` | pos, delivery |
| `order_status` | draft, pending_payment, paid, completed, cancelled, needs_review |
| `payment_method` | cash, linepay, platform_collect |
| `payment_status` | created, pending, success, failed, manual_confirmed, voided |
| `invoice_status` | none, pending, issued, failed, voided |
| `adjustment_type` | increase, decrease |
| `audit_action` | order_created, order_voided, payment_created, ... |

## 2. Tables Definition

### Identity & Tenancy

#### `stores`
| Column | Type | Default | Note |
|---|---|---|---|
| id | BIGINT | IDENTITY | PK |
| name | TEXT | - | |
| owner_id | BIGINT | - | FK(users.id) |
| created_at | TIMESTAMPTZ | now() | |

#### `users`
| Column | Type | Default | Note |
|---|---|---|---|
| id | BIGINT | IDENTITY | PK |
| username | TEXT | - | UNIQUE |
| hashed_password | TEXT | - | |

#### `store_users` (多店關聯)
| Column | Type | Default | Note |
|---|---|---|---|
| id | BIGINT | IDENTITY | PK |
| store_id | BIGINT | - | FK(stores), UNIQUE(store, user) |
| user_id | BIGINT | - | FK(users) |
| role | user_role | - | |

### Core Transaction

#### `products`
| Column | Type | Default | Note |
|---|---|---|---|
| id | BIGINT | IDENTITY | PK |
| store_id | BIGINT | - | FK(stores) |
| attributes | JSONB | - | Flexible attrs |

#### `orders`
| Column | Type | Default | Note |
|---|---|---|---|
| id | BIGINT | IDENTITY | PK |
| store_id | BIGINT | - | FK(stores) |
| order_no | BIGINT | - | Store-scoped atomic ID |
| idempotency_key | TEXT | - | **UNIQUE(store, key)** (去重關鍵) |
| business_date | DATE | now() | 報表歸屬日 |

#### `order_items`
包含 `snapshot` (快照) 欄位，確保歷史訂單價格不隨商品更動而改變。

### Compliance & Payment

#### `payments`
| Column | Type | Default | Note |
|---|---|---|---|
| id | BIGINT | IDENTITY | PK |
| idempotency_key | TEXT | - | UNIQUE(store, key) |
| provider_txn_id | TEXT | - | UNIQUE(provider, txn) |

#### `invoice_records`
| Column | Type | Default | Note |
|---|---|---|---|
| status | invoice_status | pending | |
| failed_since | TIMESTAMPTZ | - | 用於監控 > 2天異常 |

#### `daily_closings`
日結鎖帳表，一旦建立即不可修改 (`locked_at`, `locked_by`)。

#### `adjustments`
鎖帳後的唯一更正途徑 (Append-only)。

#### `audit_logs`
記錄所有關鍵操作 (`action`, `snapshot`)。
