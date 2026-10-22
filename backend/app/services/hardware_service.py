import json
import os
import uuid
import base64
from pathlib import Path
from typing import Any

from fastapi import HTTPException

from app.models.system_setting import SettingScope
from app.schemas.hardware import HardwareJob
from app.services.setting_service import SettingService


class HardwareService:
    @staticmethod
    async def enqueue(db, store_id: int, job: HardwareJob, requested_by: int) -> str:
        settings = await SettingService.get_settings_by_scope(
            db, store_id, SettingScope.DEVICE, job.device_id
        )
        store_settings = await SettingService.get_settings_by_scope(
            db, store_id, SettingScope.STORE, None
        )
        printer_type = settings.get("printer_type", "network")
        if printer_type not in {"network", "usb"}:
            raise HTTPException(status_code=400, detail="印表機連線方式必須是 network 或 usb")
        if job.action != "scan_devices" and printer_type == "network" and not settings.get("printer_ip"):
            raise HTTPException(status_code=400, detail="請先設定印表機 IP")

        payload: dict[str, Any] = {
            "id": uuid.uuid4().hex,
            "store_id": store_id,
            "requested_by": requested_by,
            "action": job.action,
            "printer": {
                "type": printer_type,
                "ip": settings.get("printer_ip", ""),
                "port": int(settings.get("printer_port", 9100)),
                "usb_path": settings.get("printer_usb_path", "/dev/usb/lp0"),
                "paper_width": settings.get("paper_width", "57mm"),
                "encoding": settings.get("printer_encoding", "cp950"),
            },
            "receipt": job.receipt.model_dump() if job.receipt else None,
        }
        logo_url = store_settings.get("logo_url", "")
        if logo_url.startswith("/static/"):
            logo_path = Path("/app/uploads") / logo_url.removeprefix("/static/")
            try:
                payload["logo_base64"] = base64.b64encode(logo_path.read_bytes()).decode("ascii")
            except OSError:
                payload["logo_base64"] = None

        spool = Path(os.getenv("HARDWARE_SPOOL_DIR", "/app/host-control/printer"))
        try:
            spool.mkdir(parents=True, exist_ok=True)
            temporary = spool / f".{payload['id']}.tmp"
            target = spool / f"{payload['id']}.json"
            temporary.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
            temporary.replace(target)
        except OSError as exc:
            raise HTTPException(status_code=503, detail="本機硬體服務尚未配置") from exc
        return payload["id"]

    @staticmethod
    def get_status(job_id: str) -> dict[str, Any]:
        if not job_id.isalnum():
            raise HTTPException(status_code=400, detail="無效的工作編號")
        spool = Path(os.getenv("HARDWARE_SPOOL_DIR", "/app/host-control/printer"))
        result_path = spool / "results" / f"{job_id}.json"
        failed_path = spool / "failed" / f"{job_id}.error.txt"
        if result_path.exists():
            try:
                return {"status": "completed", **json.loads(result_path.read_text(encoding="utf-8"))}
            except (OSError, json.JSONDecodeError) as exc:
                raise HTTPException(status_code=500, detail="無法讀取硬體掃描結果") from exc
        if failed_path.exists():
            return {"status": "failed", "devices": [], "error": failed_path.read_text(encoding="utf-8")}
        return {"status": "pending", "devices": [], "error": None}
