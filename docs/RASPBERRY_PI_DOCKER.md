# Raspberry Pi 5 Docker 部署指南

適用於全新 Raspberry Pi 5。若要在 Pi 本機自動開啟全螢幕 POS，請安裝 **Raspberry Pi OS with desktop 64-bit**；純伺服器才選 Lite。​​本專案與 Docker 都以 `arm64` 為目標，請勿選 32-bit 映像。

## 全自動安裝（建議）

把專案複製或 clone 到 Pi 後，在專案根目錄執行：

```bash
chmod +x scripts/linux/*.sh
./scripts/linux/one-click-start.sh
```

一鍵入口在首次執行時會檢查 64-bit ARM、安裝 Docker、產生資料庫與 JWT 隨機密鑰、建置容器、啟動服務並完成連線測試；後續執行則直接快速啟動。既有 `.env` 不會被覆寫。依原專案 `backend/scripts/setup_defaults.py` 建立的登入資料會保存在僅目前使用者可讀的 `.initial-credentials`。

首次安裝完成後，桌面會出現 `StallEasy POS 一鍵啟動` 圖示。開機時 systemd 先啟動 Docker；登入 labwc 桌面後，獨立的 `open-on-login.sh` 最多等待前端 180 秒，然後開啟 Chromium 最大化應用視窗。此模式隱藏一般瀏覽器分頁與網址列，保留 Wayland 輸入面板的顯示能力。若桌面環境要求信任，請在圖示上按右鍵選擇「允許啟動」。

若使用 Onboard 螢幕鍵盤，POS Chromium 會在 labwc 桌面下以 XWayland/X11 模式執行，讓 Onboard 按鍵與 Fcitx5 Chewing 走相同輸入路徑。安裝腳本會加入 Chewing 與 GTK3 輸入模組。從 Fcitx5 圖示選「Chewing／新酷音」或按 `Ctrl+Space` 切換。Onboard 按鍵仍可能顯示英文字母，Chewing 會轉成注音候選字。PIN 維持唯讀，只使用頁面數字鍵盤。更新後必須關閉舊 Chromium 視窗並重新開啟，或直接重新開機。

若 Onboard 日誌顯示 `not an X display` 或 `AT-SPI: Couldn't connect to accessibility bus`，執行 `./scripts/linux/install-touch-input.sh` 補裝 AT-SPI，並改用 `./scripts/linux/start-onboard.sh` 啟動；它會先關閉目前使用者的舊 Onboard 實例，再強制以 X11 啟動。不要同時從舊的 Onboard 桌面圖示啟動。重開機後一鍵啟動也會用此腳本自動開啟 Onboard。日誌在 `/tmp/stalleasy-onboard.log`。

`install-touch-input.sh` 也會透過 Raspberry Pi OS 的 `raspi-config` 停用內建 Squeekboard 自動彈出，避免與 Onboard 重疊，並安裝 GPL-3.0 的 Onboard 注音鍵帽版面。Onboard 預設會直接顯示ㄅㄆㄇ等鍵帽，實際中文組字仍由你已配置的 Fcitx5 Chewing 處理。可點桌面 Fcitx5 圖示選「Chewing」，或在桌面終端執行 `./scripts/linux/set-input-method.sh zhuyin`；切回英文用 `./scripts/linux/set-input-method.sh english`。

退出 kiosk 全螢幕通常可按 `Alt+F4`。若不希望自動開啟瀏覽器，可從終端執行：

```bash
AUTO_OPEN_BROWSER=false ./scripts/linux/one-click-start.sh
```

系統管理員或店主可在開班頁按「安全關機」。按鈕會再次要求確認，然後透過受限制的 systemd 請求正常關閉 Raspberry Pi；員工帳號不會看到此按鈕。Docker 容器由 `stalleasy-pos.service` 在主機開機時啟動，桌面登入後則由 `scripts/linux/open-on-login.sh` 自動開啟 kiosk。

首次安裝完成後，日常啟動只需：

```bash
./scripts/linux/start.sh
```

啟動腳本不會重新建置映像，會直接啟動既有容器、執行健康測試並顯示 POS 網址。Compose 服務已設定 `restart: unless-stopped`，因此正常重新開機後也會由 Docker 自動啟動。

從桌面終端機或檔案管理員互動執行時，腳本最後會等待按 Enter，因此視窗不會在狀態與網址出現後立刻關閉。透過 SSH 或自動排程執行時不會等待。

安全停止服務：

```bash
./scripts/linux/stop.sh
```

停止腳本使用 `docker compose stop`，不會刪除容器、資料庫或上傳檔。

以下章節是相同流程的手動操作說明，供除錯或客製化使用。

## 1. 安裝作業系統

用 Raspberry Pi Imager 寫入系統，並在進階設定中設定主機名稱（例如 `stalleasy-pos`）、管理帳號、SSH、網路及 `Asia/Taipei` 時區。正式 POS 主機建議接有線網路。

首次登入後：

```bash
ssh <帳號>@stalleasy-pos.local
sudo apt update
sudo apt full-upgrade -y
sudo reboot
```

重開後執行 `dpkg --print-architecture`，結果必須是 `arm64`。

## 2. 安裝 Docker Engine 與 Compose

使用 Docker 官方 Debian ARM64 套件庫：

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "Types: deb
URIs: https://download.docker.com/linux/debian
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc" | sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

登出再登入，執行 `docker run --rm hello-world` 及 `docker compose version` 驗證。

## 3. 把專案放到 Pi

若專案已在 Git 遠端：

```bash
mkdir -p ~/apps
cd ~/apps
git clone <Git 儲存庫網址> StallEasyPos
cd StallEasyPos
```

若尚未使用 Git，可從 Windows PowerShell 傳送：

```powershell
scp -r C:\path\to\StallEasyPos <帳號>@<Pi-IP>:/home/<帳號>/apps/
```

## 4. 建立安全設定

在專案根目錄執行：

```bash
cp .env.docker.example .env
sed -i "s|replace_with_a_long_random_password|$(openssl rand -hex 24)|" .env
sed -i "s|replace_with_a_64_character_random_hex_string|$(openssl rand -hex 32)|" .env
nano .env
```

確認 `.env` 中包含 `SEED_INITIAL_DATA=true` 與 `SETUP_DEFAULT_CREDENTIALS=true`。`.env` 不可提交至 Git。

## 5. 建置並啟動

```bash
docker compose config
docker compose build
docker compose up -d
docker compose ps
```

第一次在 Pi 建置前端可能需數分鐘。用 `docker compose logs -f --tail=100` 查看日誌。正常後執行 `hostname -I` 查 IP，再從區網裝置開啟：

- POS：`http://<Pi-IP>:3000`
- API 文件：`http://<Pi-IP>:8000/docs`

依原專案初始化規則，預設登入資料為：

- 系統管理員：帳號 `admin`、PIN `000000`
- 店主：帳號 `owner`、PIN `111111`

登入畫面雖標示「店鋪帳號」，後端同時支援上述個人帳號登入。

若仍無法登入，執行：

```bash
./scripts/linux/repair-login.sh
```

此腳本會重新套用原始 `backend/scripts/setup_defaults.py`，並繞過前端直接驗證 `admin/000000` 與 `owner/111111` 的 API 登入結果。登入欄位請輸入英文字母 `admin` 或 `owner`，不是店名。

### Docker Hub 顯示 IPv6 network is unreachable

若拉取 `node:22-alpine` 等映像時出現 `dial tcp [IPv6位址]:443: connect: network is unreachable`，執行：

```bash
chmod +x scripts/linux/fix-docker-network.sh
./scripts/linux/fix-docker-network.sh
```

腳本會先確認 Docker Hub 的 IPv4 連線正常，才停用故障的 IPv6 路徑、設定系統優先 IPv4，並讓 Docker daemon 使用系統 DNS 位址排序後重新建置。這同時處理 `network is unreachable` 與 `cannot assign requested address`。若 IPv4 也連不上，腳本不會改動 IPv6，請先處理 DNS、路由器或防火牆。

## 6. 固定 IP 與防火牆

建議在路由器依 Pi 的 MAC 位址設定 DHCP 保留位址。如果啟用 UFW，先把範例網段換成店內實際網段：

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow from 192.168.1.0/24 to any port 3000 proto tcp
sudo ufw allow from 192.168.1.0/24 to any port 8000 proto tcp
sudo ufw enable
```

不要把 3000、8000 或 PostgreSQL 直接轉發到公網；外部存取應另配 HTTPS 反向代理或 VPN。

## 7. 日常維運

```bash
# 更新
cd ~/apps/StallEasyPos
git pull
docker compose up -d --build

# 狀態與日誌
docker compose ps
docker compose logs -f backend frontend db

# 停止（資料仍保留）
docker compose down
```

切勿執行 `docker compose down -v`，它會刪除資料庫及上傳檔 volume。

## 8. 備份資料庫

```bash
mkdir -p ~/backups/stalleasy
docker compose exec -T db pg_dump -U stalleasy -d stalleasypos -Fc > ~/backups/stalleasy/stalleasy-$(date +%F-%H%M).dump
```

商品上傳圖檔存放在獨立的 `stalleasy-pos_uploads_data` Docker volume，也必須另外備份。定期將備份複製到另一台電腦或 NAS，不要只留在同一顆儲存裝置。

## 硬體建議

- 建議 8 GB RAM；4 GB 可運作，但建置 Next.js 時較吃緊
- 使用官方 27W 電源與主動散熱
- 正式營運使用 USB 3 SSD 或 NVMe，不建議長期只用 microSD
- 配置 UPS，降低結帳寫入途中斷電的風險
