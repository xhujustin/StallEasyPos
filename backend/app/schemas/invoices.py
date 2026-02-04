from pydantic import BaseModel

class InvoiceRequest(BaseModel):
    order_id: int
