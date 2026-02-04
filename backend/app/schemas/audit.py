from pydantic import BaseModel

class AuditLogOut(BaseModel):
    action: str
