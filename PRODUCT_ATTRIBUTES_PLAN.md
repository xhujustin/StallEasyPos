# 商品屬性與客製化選項實作計畫 (Product Attributes & Variants)

本計畫旨在為 StallEasy POS 系統新增完整的客製化選項功能 (Modifers)，例如：甜度、冰塊、加料等。
此功能將支援價格調整 (Price Adjustment) 與庫存連動 (Inventory Tracking)。

## 1. 資料庫模型設計 (Backend)

依據 `db-schema-v1.md` 的規劃，我們需要建立以下關聯式資料表來支援屬性系統。

### 新增資料表

#### 1. product_attributes (屬性群組)
定義一個屬性類別，例如 "甜度", "冰塊", "加料"。

```python
class ProductAttribute(Base):
    __tablename__ = "product_attributes"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    product_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False) # e.g. "甜度", "加料"
    min_selection: Mapped[int] = mapped_column(Integer, default=0) # 最少選幾項 (0=可選, 1=必選)
    max_selection: Mapped[int] = mapped_column(Integer, default=1) # 最多選幾項 (1=單選, >1=多選)
    
    # Relationships
    options: Mapped[list["ProductAttributeOption"]] = relationship(...)
```

#### 2. product_attribute_options (屬性選項)
定義該類別下的具體選項，例如 "半糖", "少冰", "珍珠"。

```python
class ProductAttributeOption(Base):
    __tablename__ = "product_attribute_options"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    attribute_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("product_attributes.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False) # e.g. "半糖", "珍珠"
    price_adjustment: Mapped[float] = mapped_column(Numeric(10, 2), default=0) # e.g. +10元
    
    # Relationships
    materials: Mapped[list["OptionMaterial"]] = relationship(...)
```

#### 3. option_materials (選項配方) - Optional (進階)
連結選項與耗材，例如 "加珍珠" -> 消耗 "珍珠 (50g)"。

```python
class OptionMaterial(Base):
    __tablename__ = "option_materials"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    option_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("product_attribute_options.id", ondelete="CASCADE"), nullable=False)
    material_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("materials.id", ondelete="RESTRICT"), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(10, 4), nullable=False) # 消耗量
```

## 2. API 介面調整 (Backend)

### 修改 Product Schema
更新 `ProductOut` 與 `ProductCreate` 以支援巢狀屬性結構。

```python
# Create 結構範例
{
  "name": "珍珠奶茶",
  "price": 50,
  "attributes": [
    {
      "name": "甜度",
      "min_selection": 1,
      "max_selection": 1,
      "options": [
        { "name": "正常糖", "price_adjustment": 0 },
        { "name": "半糖", "price_adjustment": 0 }
      ]
    },
    {
      "name": "加料",
      "min_selection": 0,
      "max_selection": 5,
      "options": [
        { "name": "珍珠", "price_adjustment": 10 },
        { "name": "椰果", "price_adjustment": 5 }
      ]
    }
  ]
}
```

### 新增 API Endpoints
雖然可以透過 Product API 巢狀更新，但獨立的 API 有助於細粒度管理。
- `POST /api/v1/products/{id}/attributes`
- `PATCH /api/v1/attributes/{id}`
- `DELETE /api/v1/attributes/{id}`

## 3. 前端實作 (Frontend)

### Admin 後台 (設定端)
位置：`src/app/(admin)/admin/products/[id]/edit/page.tsx`

1.  **新增「屬性設定」頁籤 (Tabs)**：
    - 在「基本資訊」與「配方」旁新增「屬性」。
2.  **屬性群組管理 UI**：
    - 新增/編輯/刪除屬性群組 (e.g., "甜度")。
    - 設定 必選/單選/多選 邏輯。
3.  **選項管理 UI**：
    - 在每個群組下新增選項。
    - 設定 加價金額。
    - (進階) 設定 綁定耗材 (類似 Product Recipe UI)。

### POS 前台 (點餐端)
位置：`src/app/(pos)/pos/page.tsx`

1.  **修改點餐互動**：
    - 點擊商品卡片時，檢查該商品是否有屬性 (`product.attributes.length > 0`)。
    - 若無屬性 -> 直接加入購物車 (現有邏輯)。
    - 若有屬性 -> 開啟「商品選項對話框」。
2.  **商品選項對話框 (ProductOptionDialog)**：
    - 顯示各個屬性群組。
    - 根據 `min/max_selection` 限制選擇 (Radio for 單選, Checkbox for 多選)。
    - 即時計算總金額 (本體價格 + 選項加價)。
3.  **更新購物車結構 (CartStore)**：
    - `CartItem` 需新增 `selectedOptions` 欄位。
    - `id` 生成邏輯需包含選項雜湊 (Hash)，確保 "珍珠奶茶(半糖)" 與 "珍珠奶茶(全糖)" 被視為不同項目，不會合併數量。

## 4. 執行步驟

1.  **Backend Models**: 建立 `product_attribute.py` 等模型檔案。
2.  **Database Migration**: 產生並執行 Alembic 遷移腳本。
3.  **Backend API**: 更新 `ProductService` 支援屬性的 CRUD。
4.  **Frontend API**: 更新 `products.ts` 定義介面。
5.  **Admin UI**: 實作屬性編輯器。
6.  **POS UI**: 實作選項選擇對話框。
7.  **Cart Logic**: 更新購物車狀態管理。

## 5. 驗證情境

1.  **建立**: 在後台為 "紅茶" 新增 "甜度" (單選) 與 "加料" (多選, +$10)。
2.  **POS**: 點擊 "紅茶"，應跳出選擇視窗。
3.  **限制**: 沒選 "甜度" (必選) 時，加入購物車按鈕應鎖定。
4.  **加價**: 選擇 "加珍珠"，總金額應增加 $10。
5.  **購物車**: 同商品不同選項應分開列出；同選項應合併數量。
