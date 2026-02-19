# Database Schema V1 (Commercial Grade)

> Based on Technical Spec V1 and User Feedback (2026-02-05)

## 1. Enums & Types

```sql
CREATE TYPE user_role AS ENUM ('owner','manager','staff');
CREATE TYPE order_source AS ENUM ('pos','delivery');
CREATE TYPE order_status AS ENUM ('draft','pending_payment','paid','completed','cancelled','needs_review');
CREATE TYPE payment_method AS ENUM ('cash','linepay','platform_collect');
CREATE TYPE payment_status AS ENUM ('created','pending','success','failed','manual_confirmed','voided');
CREATE TYPE invoice_status AS ENUM ('none','pending','issued','failed','voided');
CREATE TYPE adjustment_type AS ENUM ('increase','decrease');
CREATE TYPE audit_action AS ENUM (
  'order_created','order_voided','payment_created','payment_confirmed',
  'closing_locked','adjustment_created','invoice_requested','invoice_issued','invoice_failed','invoice_retry'
);
CREATE TYPE shift_status AS ENUM ('open', 'closed');
CREATE TYPE setting_scope AS ENUM ('store', 'device', 'user');
```

## 2. Identity & Tenancy

### Stores
```sql
CREATE TABLE stores (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stores_owner_id ON stores(owner_id);
```

### Users
```sql
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  hashed_password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Store Users (Multi-Tenancy)
```sql
CREATE TABLE store_users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  pin_hash TEXT NULL, -- 變更 PIN 碼需驗證 old_pin，且不允許於後端直接回傳
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);
CREATE INDEX idx_store_users_store ON store_users(store_id);
CREATE INDEX idx_store_users_user ON store_users(user_id);
```

## 3. Core Transaction

### Products
```sql
CREATE TABLE products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  cost NUMERIC(10,2) NULL,
  category TEXT NULL,
  image_url TEXT NULL, -- 商品圖片 URL，支援自動清理舊圖
  attributes JSONB NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_store_category ON products(store_id, category);
```

### Categories
```sql
CREATE TABLE categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, name)
);
```

### Materials (High Precision)
```sql
CREATE TABLE materials (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  stock_quantity NUMERIC(10,4) NOT NULL DEFAULT 0, -- Precision 4 for micro amounts
  unit_cost NUMERIC(10,4) NOT NULL DEFAULT 0,      -- Precision 4
  low_stock_threshold NUMERIC(10,4) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, name)
);
```

### Product Materials (Recipe)
```sql
CREATE TABLE product_materials (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  material_id BIGINT NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  quantity NUMERIC(10,4) NOT NULL,                 -- Recipe usage
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, material_id)
);
```

### Orders
```sql
CREATE TABLE orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  order_no BIGINT NOT NULL,                      -- per store monotonic
  source order_source NOT NULL DEFAULT 'pos',
  status order_status NOT NULL,
  order_type order_type NOT NULL DEFAULT 'take_out',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,     -- 原始總金額 (未計服務費與折扣)
  service_fee NUMERIC(10,2) NOT NULL DEFAULT 0,  -- 服務費金額
  service_fee_rate NUMERIC(10,2) NOT NULL DEFAULT 0, -- 服務費率 (%)
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0, -- 折扣金額 (直接扣減)
  discount_note TEXT NULL,                       -- 折扣原因/備註
  total_amount NUMERIC(10,2) NOT NULL,           -- 最終應付金額
  payment_method payment_method NULL,
  idempotency_key TEXT NOT NULL,                 -- Critical for offline sync
  business_date DATE NOT NULL DEFAULT (now()::date),
  is_voided BOOLEAN NOT NULL DEFAULT FALSE,
  voided_at TIMESTAMPTZ NULL,
  voided_by BIGINT NULL REFERENCES users(id),
  void_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, order_no),
  UNIQUE(store_id, idempotency_key)
);
CREATE INDEX idx_orders_store_created ON orders(store_id, created_at DESC);
CREATE INDEX idx_orders_store_date ON orders(store_id, business_date);
CREATE INDEX idx_orders_store_status ON orders(store_id, status);
```

### Order Items
```sql
CREATE TABLE order_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NULL,                        -- Product might be deleted
  name_snapshot TEXT NOT NULL,
  price_snapshot NUMERIC(10,2) NOT NULL,
  cost_snapshot NUMERIC(10,2) NULL,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1,
  note TEXT NULL,
  packaging_used TEXT NULL,                      -- bring_your_own / shop_default
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
```

### Payments
```sql
CREATE TABLE payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  method payment_method NOT NULL,
  provider TEXT NULL,                            -- 'linepay'
  provider_txn_id TEXT NULL,
  status payment_status NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  idempotency_key TEXT NOT NULL,
  raw_payload JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, idempotency_key),
  UNIQUE(provider, provider_txn_id)
);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_store_created ON payments(store_id, created_at DESC);
CREATE INDEX idx_payments_status ON payments(status);
```

## 4. Compliance & Audit

### Daily Closings
```sql
CREATE TABLE daily_closings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  business_date DATE NOT NULL,
  expected_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
  actual_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
  short_over NUMERIC(10,2) NOT NULL DEFAULT 0,
  locked_by BIGINT NOT NULL REFERENCES users(id),
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, business_date)
);
CREATE INDEX idx_closings_store_date ON daily_closings(store_id, business_date);
```

### Adjustments
```sql
CREATE TABLE adjustments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  business_date DATE NOT NULL,
  adjustment_type adjustment_type NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  reason_code TEXT NOT NULL,
  reason_note TEXT NULL,
  related_order_id BIGINT NULL REFERENCES orders(id),
  created_by BIGINT NOT NULL REFERENCES users(id),
  ai_flag TEXT NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_adjustments_store_date ON adjustments(store_id, business_date);
```

### Invoice Records
```sql
CREATE TABLE invoice_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status invoice_status NOT NULL DEFAULT 'pending',
  invoice_number TEXT NULL,
  carrier TEXT NULL,             -- 載具
  tax_id TEXT NULL,              -- 統編
  provider TEXT NULL,            -- 加值中心/服務商
  error_message TEXT NULL,
  last_attempt_at TIMESTAMPTZ NULL,
  next_retry_at TIMESTAMPTZ NULL,
  failed_since TIMESTAMPTZ NULL, -- 用於 >2日 判斷
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);
CREATE INDEX idx_invoices_store_status ON invoice_records(store_id, status);
CREATE INDEX idx_invoices_failed_since ON invoice_records(failed_since);
```

### Audit Logs
```sql
CREATE TABLE audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  actor_user_id BIGINT NOT NULL REFERENCES users(id),
  action audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id BIGINT NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_store_created ON audit_logs(store_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

## 5. System Configuration

### System Settings
```sql
CREATE TABLE system_settings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scope setting_scope NOT NULL DEFAULT 'store',
  target_id BIGINT NULL,          -- store_id, user_id depending on scope
  key TEXT NOT NULL,
  value JSONB NOT NULL,           -- Structured config (e.g. {tax_rate: 5})
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scope, target_id, key)
);
CREATE INDEX idx_settings_target ON system_settings(scope, target_id);
```
```
