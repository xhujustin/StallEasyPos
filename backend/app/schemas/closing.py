from pydantic import BaseModel

class ClosingCreate(BaseModel):
    actual_cash: float
