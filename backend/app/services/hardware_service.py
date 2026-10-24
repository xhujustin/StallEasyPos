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
    def _legacy_printer(settings: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": "legacy",
            "name": "主要印表機",
            "enabled": True,
            "type": settings.get("printer_type", "network"),
            "ip": settings.get("printer_ip", ""),
            "port": int(settings.get("printer_port", 9100)),
            "usb_path": settings.get("printer_usb_path", "/dev/usb/lp0"),
            "paper_width": settings.get("paper_width", "57mm"),
            "encoding": settings.get("printer_encoding", "cp950"),
            "outputs": ["receipt", "number_ticket", "shift_report", "drawer"],
        }

    @staticmethod
    async def enqueue(db, store_id: int, job: HardwareJob, requested_by: int) -> str:
        settings = await SettingService.get_settings_by_scope(
            db, store_id, SettingScope.DEVICE, job.device_id
        )
        store_settings = await SettingService.get_settings_by_scope(
            db, store_id, SettingScope.STORE, None
        )
        configured = settings.get("printers")
        printers = configured if isinstance(configured, list) and configured else [HardwareService._legacy_printer(settings)]
        printers = [printer for printer in printers if printer.get("enabled", True)]
        output_by_action = {
            "print_receipt": "receipt",
            "print_kitchen": "kitchen",
            "print_label": "label",
            "print_number_ticket": "number_ticket",
            "print_shift_report": "shift_report",
            "open_drawer": "drawer",
        }
        if job.printer_id:
            printers = [printer for printer in printers if printer.get("id") == job.printer_id]
        elif job.action in output_by_action and configured:
            output = output_by_action[job.action]
            printers = [printer for printer in printers if output in printer.get("outputs", [])]
        elif job.action == "test_print":
            printers = printers[:1]

        if job.action != "scan_devices" and not printers:
            raise HTTPException(status_code=400, detail="沒有啟用可處理此輸出內容的印表機")
        for printer in printers:
            printer_type = printer.get("type", "network")
            if printer_type not in {"network", "usb"}:
                raise HTTPException(status_code=400, detail="印表機連線方式必須是 network 或 usb")
            if printer_type == "network" and not printer.get("ip"):
                raise HTTPException(status_code=400, detail=f"印表機「{printer.get('name', '')}」尚未設定 IP")

        receipt_payload = job.receipt.model_dump() if job.receipt else None
        if receipt_payload is not None:
            receipt_payload["store_name"] = receipt_payload.get("store_name") or "StallEasy POS"
            receipt_payload["receipt_header"] = store_settings.get("receipt_header", "")
            receipt_payload["receipt_footer"] = store_settings.get("receipt_footer", "")
            receipt_payload["business_id"] = store_settings.get("business_id", "")

        payload: dict[str, Any] = {
            "id": uuid.uuid4().hex,
            "store_id": store_id,
            "requested_by": requested_by,
            "action": job.action,
            "printers": printers,
            "printer": printers[0] if printers else HardwareService._legacy_printer(settings),
            "receipt": receipt_payload,
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
