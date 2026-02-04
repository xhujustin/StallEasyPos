from pydantic import BaseModel

class OrderCreate(BaseModel):
    store_id: int
    items: list
