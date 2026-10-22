from pathlib import Path
import os

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import StoreUser, User, UserRole
from app.schemas.common import ResponseBase

router = APIRouter()


@router.post("/shutdown", response_model=ResponseBase[bool], status_code=status.HTTP_202_ACCEPTED)
async def request_shutdown(
    store_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Request a graceful Raspberry Pi shutdown via the host systemd watcher."""
    allowed = current_user.is_admin
    if not allowed:
        relation = await db.execute(
            select(StoreUser).where(
                StoreUser.store_id == store_id,
                StoreUser.user_id == current_user.id,
                StoreUser.role == UserRole.OWNER,
            )
        )
        allowed = relation.scalar_one_or_none() is not None

    if not allowed:
        raise HTTPException(status_code=403, detail="只有系統管理員或店主可以關機")

    control_dir = Path(os.getenv("HOST_CONTROL_DIR", "/app/host-control"))
    try:
        control_dir.mkdir(parents=True, exist_ok=True)
        request_file = control_dir / "shutdown.request"
        request_file.write_text(f"requested_by={current_user.id}\n", encoding="utf-8")
    except OSError as exc:
        raise HTTPException(status_code=503, detail="主機關機控制尚未配置") from exc

    return ResponseBase(message="關機請求已送出", data=True)
