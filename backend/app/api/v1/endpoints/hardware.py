from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id, get_db
from app.schemas.common import ResponseBase
from app.schemas.hardware import HardwareJob, HardwareJobStatus
from app.services.hardware_service import HardwareService

router = APIRouter()


@router.post("/jobs", response_model=ResponseBase[str], status_code=202)
async def create_hardware_job(
    store_id: int,
    job: HardwareJob,
    db: AsyncSession = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
):
    job_id = await HardwareService.enqueue(db, store_id, job, current_user_id)
    return ResponseBase(message="硬體指令已送出", data=job_id)


@router.get("/jobs/{job_id}", response_model=ResponseBase[HardwareJobStatus])
async def get_hardware_job(
    job_id: str,
    current_user_id: int = Depends(get_current_user_id),
):
    return ResponseBase(data=HardwareService.get_status(job_id))
