# 商品管理系統技術文件

## 概述

商品管理系統提供完整的商品、分類、耗材和屬性管理功能,支援複雜的成本計算和庫存追蹤。

## 資料庫設計

### 新增資料表

#### 1. categories (商品分類)
```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_id, name)
);
```

#### 2. materials (耗材/原料)
```sql
CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id),
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    stock_quantity DECIMAL(10, 2) DEFAULT 0,
    unit_cost DECIMAL(10, 2) NOT NULL,
    low_stock_threshold DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_id, name)
);
```

#### 3. product_attributes (商品屬性)
```sql
CREATE TABLE product_attributes (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, name)
);
```

#### 4. product_attribute_options (屬性選項)
```sql
CREATE TABLE product_attribute_options (
    id SERIAL PRIMARY KEY,
    attribute_id INTEGER NOT NULL REFERENCES product_attributes(id),
    name VARCHAR(50) NOT NULL,
    price_adjustment DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(attribute_id, name)
);
```

#### 5. option_materials (選項耗材關聯)
```sql
CREATE TABLE option_materials (
    id SERIAL PRIMARY KEY,
    option_id INTEGER NOT NULL REFERENCES product_attribute_options(id),
    material_id INTEGER NOT NULL REFERENCES materials(id),
    quantity DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(option_id, material_id)
);
```

#### 6. store_settings (店鋪設定)
```sql
CREATE TABLE store_settings (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) UNIQUE,
    fixed_cost_per_item DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 修改現有資料表

#### products
- 新增欄位: `image_url VARCHAR(500)`
- 移除欄位: `attributes JSONB`

## API 規範

### Categories API

#### 取得分類列表
```
GET /api/v1/categories?store_id={store_id}
```

**回應範例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "store_id": 1,
      "name": "飲料",
      "description": "各式飲品",
      "created_at": "2026-02-13T10:00:00",
      "updated_at": "2026-02-13T10:00:00"
    }
  ]
}
```

#### 建立分類
```
POST /api/v1/categories
```

**請求範例**:
```json
{
  "store_id": 1,
  "name": "飲料",
  "description": "各式飲品"
}
```

#### 更新分類
```
PUT /api/v1/categories/{id}
```

#### 刪除分類
```
DELETE /api/v1/categories/{id}
```


### Products API

#### 取得商品列表
```
GET /api/v1/products?store_id={store_id}
```

**回應範例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "store_id": 1,
      "name": "珍珠奶茶",
      "price": 50.0,
      "category": "飲料",
      "description": "經典珍珠奶茶",
      "is_active": true,
      "image_url": "https://example.com/image.jpg",
      "cost": 25.0,
      "created_at": "2026-02-13T10:00:00",
      "updated_at": "2026-02-13T10:00:00"
    }
  ]
}
```

#### 取得單一商品
```
GET /api/v1/products/{product_id}?store_id={store_id}
```

#### 建立商品
```
POST /api/v1/products?store_id={store_id}
```

**請求範例**:
```json
{
  "name": "珍珠奶茶",
  "price": 50.0,
  "category": "飲料",
  "description": "經典珍珠奶茶",
  "is_active": true,
  "image_url": "https://example.com/image.jpg"
}
```

#### 更新商品
```
PATCH /api/v1/products/{product_id}
```

**請求範例** (部分更新):
```json
{
  "price": 60.0,
  "is_active": false
}
```

#### 刪除商品
```
DELETE /api/v1/products/{product_id}?store_id={store_id}
```

### Materials API

#### 取得耗材列表
```
GET /api/v1/materials?store_id={store_id}
```

**回應範例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "store_id": 1,
      "name": "茶葉",
      "unit": "克",
      "stock_quantity": 5000.0,
      "unit_cost": 0.5,
      "low_stock_threshold": 1000.0,
      "created_at": "2026-02-13T10:00:00",
      "updated_at": "2026-02-13T10:00:00"
    }
  ]
}
```

#### 取得低庫存耗材
```
GET /api/v1/materials/low-stock?store_id={store_id}
```

#### 建立耗材
```
POST /api/v1/materials
```

**請求範例**:
```json
{
  "store_id": 1,
  "name": "茶葉",
  "unit": "克",
  "stock_quantity": 5000.0,
  "unit_cost": 0.5,
  "low_stock_threshold": 1000.0
}
```

#### 更新耗材
```
PUT /api/v1/materials/{id}
```

#### 刪除耗材
```
DELETE /api/v1/materials/{id}
```

## 資料模型 (Pydantic Schemas)

### CategoryCreate
```python
class CategoryCreate(BaseModel):
    store_id: int
    name: str
    description: Optional[str] = None
```

### CategoryOut
```python
class CategoryOut(BaseModel):
    id: int
    store_id: int
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
```

### MaterialCreate
```python
class MaterialCreate(BaseModel):
    store_id: int
    name: str
    unit: str
    stock_quantity: float = 0
    unit_cost: float
    low_stock_threshold: Optional[float] = None
```

### MaterialOut
```python
class MaterialOut(BaseModel):
    id: int
    store_id: int
    name: str
    unit: str
    stock_quantity: float
    unit_cost: float
    low_stock_threshold: Optional[float]
    created_at: datetime
    updated_at: datetime
```

## 前端API客戶端

### categories.ts
```typescript
export const categoryApi = {
  getCategories: async (storeId: number) => {
    const response = await apiClient.get<ResponseBase<Category[]>>(
      '/categories',
      { params: { store_id: storeId } }
    );
    return response.data.data;
  },
  
  createCategory: async (data: CategoryCreate) => {
    const response = await apiClient.post<ResponseBase<Category>>(
      '/categories',
      data
    );
    return response.data.data;
  },
  
  // ... 其他方法
};
```

### materials.ts
```typescript
export const materialApi = {
  getMaterials: async (storeId: number) => {
    const response = await apiClient.get<ResponseBase<Material[]>>(
      '/materials',
      { params: { store_id: storeId } }
    );
    return response.data.data;
  },
  
  getLowStockMaterials: async (storeId: number) => {
    const response = await apiClient.get<ResponseBase<Material[]>>(
      '/materials/low-stock',
      { params: { store_id: storeId } }
    );
    return response.data.data;
  },
  
  // ... 其他方法
};
```

## 使用範例

### 建立測試資料

執行測試資料腳本:
```bash
cd backend
python -m app.seed_product_management
```

### 資料庫遷移

```bash
cd backend
.\migrate_db.bat
```

或手動執行:
```bash
cd backend
.\.venv\Scripts\activate
alembic upgrade head
```

## 成本計算邏輯

### 商品成本計算公式
```
商品成本 = 基礎成本 + 屬性選項成本 + 固定成本

其中:
- 基礎成本 = Σ(耗材單價 × 使用量)
- 屬性選項成本 = Σ(選項耗材單價 × 使用量) + 選項價格調整
- 固定成本 = 店鋪固定成本/每件商品
```

### 範例
假設一杯珍珠奶茶:
- 基礎耗材: 茶葉(10g × $0.5) + 牛奶(100ml × $0.3) = $8
- 選擇「大杯」選項: 珍珠(50g × $0.2) + 價格調整($5) = $15
- 固定成本: $2
- **總成本**: $8 + $15 + $2 = $25

## 下一步開發

- [x] 分類管理頁面
- [x] 商品新增/編輯/刪除功能
- [ ] 商品屬性系統UI
- [ ] 圖片上傳功能
- [ ] 耗材管理頁面
- [ ] 成本計算自動化
- [ ] 庫存警告通知

## 相關檔案

**後端**:
- `backend/migrations/versions/002_product_management.py`
- `backend/app/models/category.py`
- `backend/app/models/material.py`
- `backend/app/services/category_service.py`
- `backend/app/services/material_service.py`
- `backend/app/api/v1/endpoints/categories.py`
- `backend/app/api/v1/endpoints/materials.py`

**前端**:
- `frontend/src/lib/api/categories.ts`
- `frontend/src/lib/api/materials.ts`
- `frontend/src/app/(admin)/admin/products/page.tsx`
