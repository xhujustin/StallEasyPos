# StallEasy POS 設計系統規範 (Design System)

**文件版本**: v1.0  
**風格代號**: Minimalist Zen (極簡禪意)  
**設計原則**: Swiss Modernism, Precision, Trustworthiness  
**適用範圍**: 桌面版 POS, 平板 POS (iPad Pro), 手機版 Owner App

---

## 1. 核心理念 (Core Philosophy)

本系統採用 **"Minimalist Zen"** 風格，強調透過極致的網格、精準的排版與留白，傳遞「帳務精確」、「專業可信」的品牌形象。這不是一個吵雜的點餐系統，而是一個專業的財務管理終端。

- **Precision (精準)**: 像素級對齊，強調數據的可讀性。
- **Efficiency (效率)**: 減少裝飾性元素，以功能為導向。
- **Hierarchy (層級)**: 透過字重與大小明確區分資訊層級，而非依賴過多的顏色。

---

## 2. 色彩系統 (Color Palette)

色彩計畫極其克制，主色調為深沉的板岩灰，搭配奢華金作為關鍵行動指引，背景保持絕對純淨的白。

### 2.1 主色 (Primary)
用於導航欄、主要文字、強調區塊背景。
- **Slate Grey 900**: `#0F172A` (主要文字 / App Bar)
- **Slate Grey 700**: `#334155` (次要文字 / 未選中狀態)
- **Slate Grey 500**: `#64748B` (輔助文字 / Placeholder)

### 2.2 強調色 (Accent)
用於 CTA (Call-to-Action) 按鈕、選中狀態、關鍵數據高亮。
- **Luxury Gold**: `#D4AF37` (Primary Button / Active State)
- **Gold Hover**: `#C5A028` (Hover State)
- **Gold Light**: `#F9F3D8` (Background Highlight)

### 2.3 功能色 (Functional)
- **Success**: `#059669` (Emerald Green) - 交易成功
- **Error**: `#DC2626` (Red 600) - 刪除、錯誤、作廢
- **Warning**: `#D97706` (Amber 600) - 庫存緊張
- **Background**: `#FFFFFF` (Pure White)
- **Surface**: `#F8FAFC` (Slate 50) - 表單背景、次要卡片

---

## 3. 排版系統 (Typography)

使用無襯線字體，強調數字的等寬特性 (Tabular Lining) 以利金額對齊。

- **Font Family**: `Inter`, `Helvetica Neue`, `sans-serif`
- **Monospace**: `JetBrains Mono` (用於訂單編號、金額計算細節)

| 樣式 (Style) | 大小 (Size) | 字重 (Weight) | 行高 (Line Height) | 用途 |
|---|---|---|---|---|
| **Display XL** | 32px | Bold (700) | 1.2 | 總金額顯示 |
| **Heading L** | 24px | SemiBold (600) | 1.3 | 頁面標題 |
| **Heading M** | 20px | Medium (500) | 1.4 | 卡片標題 |
| **Body Base** | 16px | Regular (400) | 1.5 | 一般內文 |
| **Body Small** | 14px | Regular (400) | 1.5 | 輔助說明 |
| **Caption** | 12px | Regular (400) | 1.2 | 標籤、時間戳 |

---

## 4. UI 元件規範 (Component Library)

### 4.1 網格與間距 (Grid & Spacing)
- **Base Unit**: 4px
- **Padding**: 16px (mb-4), 24px (mb-6), 32px (mb-8)
- **Gap**: Grid items gap 16px or 24px.
- **Radius**:
  - `4px` (Small): 按鈕、輸入框 (微圓角，強調俐落感)
  - `8px` (Medium): 卡片、對話框
  - 禁止使用全圓角 (Pill shape) 按鈕，維持方正風格。

### 4.2 卡片 (Cards)
- **Style**: Flat or Minimal Border
- **Background**: White `#FFFFFF`
- **Border**: 1px solid `#E2E8F0` (Slate 200)
- **Shadow**: `shadow-sm` (Tailwind) - 僅在 Hover 時增加 `shadow-md`。

### 4.3 按鈕 (Buttons)
- **Primary (Gold)**: 背景 `#D4AF37`，文字 `#FFFFFF` (或深灰 `#0F172A` 視對比度而定，建議深灰以增強可讀性)，Radius 4px。
- **Secondary (Outline)**: 邊框 1px `#334155`，文字 `#334155`，背景透明。
- **Ghost**: 無邊框，Hover 時背景 `#F1F5F9`。

### 4.4 輸入框 (Inputs)
- **Height**: 48px (Touch friendly)
- **Border**: 1px solid `#CBD5E1` (Slate 300)
- **Focus**: Border `#334155` (Slate 700), Ring 0px (不使用模糊光暈，僅變色)。

---

## 5. 互動與動效 (Interaction & Motion)

遵循 "Snappy & Precise" 原則。

- **Duration**: 極短，75ms ~ 150ms。
- **Easing**: `ease-out` (快速開始，緩慢結束)。
- **Hover**: 顏色亮度變化 (Brightness shift) 或 1px 上移。
- **Click**: `transform: scale(0.98)` (微幅縮放，紮實的回饋感)。

---

## 6. Pre-delivery Checklist (UI/UX Pro Max)

- [ ] 所有可點擊元素游標須為 `cursor-pointer`。
- [ ] 金額欄位必須靠右對齊 (Right-aligned)。
- [ ] 數字字型必須啟用 `frac` (分數) 與 `tnum` (等寬數字) OpenType 特性。
- [ ] 淺色模式下的文字對比度需符合 WCAG AA 標準 (> 4.5:1)。
- [ ] 禁止使用 Emoji 作為 Icon，必須使用 SVG Icons (推薦 Lucide React 或 Heroicons)。
