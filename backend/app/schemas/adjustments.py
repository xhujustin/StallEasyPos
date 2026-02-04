from pydantic import BaseModel

class AdjustmentCreate(BaseModel):
    amount: float
    reason: str
