from typing import List, Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.deps import get_db, get_current_user_id, verify_password
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogOut
from app.schemas.common import ResponseBase
from app.services.store_service import StoreService

router = APIRouter()

@router.get("/", response_model=ResponseBase[List[AuditLogOut]])
async def list_audit_logs(
    store_id: Annotated[int, Query()],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user_id: Annotated[int, Depends(get_current_user_id)]
):
    """
    查詢稽核日誌
    """
    await StoreService.get_store_if_authorized(db, store_id, current_user_id)
    
    result = await db.execute(select(AuditLog).where(AuditLog.store_id == store_id).order_by(AuditLog.created_at.desc()).limit(100))
    return ResponseBase(data=result.scalars().all())
