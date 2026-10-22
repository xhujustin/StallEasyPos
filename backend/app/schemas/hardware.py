from typing import Literal, Optional, Union

from pydantic import BaseModel, Field


class ReceiptLine(BaseModel):
    name: str
    quantity: float
    amount: float
    options: list[str] = Field(default_factory=list)
    note: Optional[str] = None


class ReceiptJob(BaseModel):
    order_no: str
    store_name: str = "StallEasy POS"
    created_at: str
    cashier: str = ""
    payment_method: str = "cash"
    subtotal: Optional[float] = None
    service_fee: float = 0
    discount_amount: float = 0
    discount_note: Optional[str] = None
    total: float
    cash_received: Optional[float] = None
    change: Optional[float] = None
    lines: list[ReceiptLine] = Field(default_factory=list)


class ShiftReportProduct(BaseModel):
    name: str
    quantity: float
    amount: float


class ShiftReportJob(BaseModel):
    report_type: Literal["shift"] = "shift"
    shift_id: int
    start_time: str
    end_time: str
    opened_by: str = ""
    closed_by: str = ""
    order_count: int = 0
    void_count: int = 0
    total_sales: float = 0
    cash_sales: float = 0
    non_cash_sales: float = 0
    total_cost: float = 0
    total_net_profit: float = 0
    initial_cash: float = 0
    cash_added: float = 0
    cash_removed: float = 0
    expected_cash: float = 0
    final_cash: float = 0
    shortage: float = 0
    product_sales: list[ShiftReportProduct] = Field(default_factory=list)


class HardwareJob(BaseModel):
    action: Literal["print_receipt", "print_number_ticket", "print_shift_report", "open_drawer", "test_print", "scan_devices"]
    device_id: str = Field(min_length=1)
    receipt: Optional[Union[ReceiptJob, ShiftReportJob]] = None


class HardwareJobStatus(BaseModel):
    status: Literal["pending", "completed", "failed"]
    devices: list[dict] = Field(default_factory=list)
    error: Optional[str] = None
