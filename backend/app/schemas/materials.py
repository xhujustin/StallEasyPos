from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict

# Material Schemas
class MaterialCreate(BaseModel):
    name: str
    unit: str  # g, ml, 個, 包
    stock_quantity: Decimal = Decimal("0")
    unit_cost: Decimal = Decimal("0")
    low_stock_threshold: Optional[Decimal] = Decimal("0")
    default_purchase_unit: Optional[str] = None
    default_conversion_rate: Optional[Decimal] = None
    default_supplier: Optional[str] = None
    initial_purchase_quantity: Optional[Decimal] = None
    initial_purchase_unit_price: Optional[Decimal] = None
    material_type: str = "raw"
    output_quantity: Decimal = Decimal("1")
    group_name: Optional[str] = None
    is_active: bool = True
    display_order: int = 0

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    stock_quantity: Optional[Decimal] = None
    unit_cost: Optional[Decimal] = None
    low_stock_threshold: Optional[Decimal] = None
    output_quantity: Optional[Decimal] = None
    group_name: Optional[str] = None


class CompositionItemCreate(BaseModel):
    material_id: int
    quantity: Decimal


class CompositionItemOut(BaseModel):
    id: int
    component_material_id: int
    quantity: Decimal
    model_config = ConfigDict(from_attributes=True)

class MaterialOut(BaseModel):
    id: int
    store_id: int
    name: str
    unit: str
    stock_quantity: Decimal
    unit_cost: Decimal
    low_stock_threshold: Optional[Decimal]
    material_type: str = "raw"
    output_quantity: Decimal = Decimal("1")
    components: List[CompositionItemOut] = []
    group_name: Optional[str] = None
    is_active: bool = True
    display_order: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class CompositeMaterialCreate(BaseModel):
    name: str
    unit: str
    output_quantity: Decimal
    components: List[CompositionItemCreate]
    group_name: Optional[str] = None


class InventoryItemCreate(BaseModel):
    name: str
    purchase_unit: str
    conversion_rate: Decimal
    supplier: Optional[str] = None


class InventoryItemOut(InventoryItemCreate):
    id: int
    material_id: int
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class MaterialPurchaseCreate(BaseModel):
    inventory_item_id: Optional[int] = None
    purchase_quantity: Decimal
    purchase_unit: str
    conversion_rate: Decimal
    unit_price: Decimal
    supplier: Optional[str] = None
    note: Optional[str] = None


class MaterialPurchaseOut(BaseModel):
    id: int
    material_id: int
    inventory_item_id: Optional[int]
    purchase_quantity: Decimal
    purchase_unit: str
    conversion_rate: Decimal
    base_quantity: Decimal
    unit_price: Decimal
    total_cost: Decimal
    resulting_average_cost: Decimal
    supplier: Optional[str]
    note: Optional[str]
    purchased_at: datetime
    model_config = ConfigDict(from_attributes=True)


class InventoryTransactionOut(BaseModel):
    id: int
    material_id: int
    transaction_type: str
    quantity_change: Decimal
    balance_before: Decimal
    balance_after: Decimal
    unit_cost_snapshot: Decimal
    total_cost: Decimal
    purchase_id: Optional[int]
    reference_type: Optional[str]
    reference_id: Optional[int]
    note: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class MaterialGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    display_order: int = 0


class MaterialGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None


class MaterialGroupOut(MaterialGroupCreate):
    id: int
    store_id: int
    model_config = ConfigDict(from_attributes=True)


class MaterialGroupReorder(BaseModel):
    group_ids: List[int]

class MaterialReorder(BaseModel):
    material_ids: List[int]
