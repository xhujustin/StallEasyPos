# 腳本分類

## Windows

- `windows/start-dev.bat`：預設開放區網連線的前端開發伺服器。
- `windows/start-dev-local.bat`：僅允許本機連線的前端開發伺服器。
- `windows/start-backend.bat`：後端開發伺服器，綁定 `0.0.0.0:8000`。
- `windows/setup-frontend.bat`、`windows/setup-backend.bat`：環境安裝。
- `windows/test-backend.bat`：執行後端測試。

## Linux / Raspberry Pi

- `linux/start-dev.sh`：預設開放區網連線的前端開發伺服器。
- `linux/one-click-start.sh`：Raspberry Pi 首次安裝或日常啟動入口。
- `linux/start.sh`、`linux/stop.sh`：啟動或停止 Docker 服務。
- 其他 `linux/*.sh`：部署、Kiosk、觸控輸入及維護工具。

`scripts/` 根目錄的 Python 檔案是硬體服務與輸入工具，會被 Linux 系統服務使用，因此不歸入單一作業系統目錄。
