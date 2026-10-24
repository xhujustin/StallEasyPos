#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"
CREDENTIAL_FILE="$PROJECT_DIR/.initial-credentials"

pause_on_exit() {
  local exit_code=$?
  if [[ "$exit_code" -ne 0 ]]; then
    printf '\n[ERROR] 安裝未完成，請查看上方錯誤訊息。\n' >&2
  fi
  if [[ -t 0 && "${STALLEASY_NO_PAUSE:-0}" != "1" ]]; then
    printf '\n按 Enter 關閉視窗...'
    read -r _ || true
  fi
  return "$exit_code"
}
trap pause_on_exit EXIT

log() { printf '\n[StallEasy POS] %s\n' "$*"; }
fail() { printf '\n[ERROR] %s\n' "$*" >&2; exit 1; }

if [[ "${EUID}" -eq 0 ]]; then
  fail "請以一般使用者執行，不要直接使用 sudo；腳本會在需要時自行呼叫 sudo。"
fi

[[ "$(uname -s)" == "Linux" ]] || fail "此腳本只支援 Linux。"
ARCH="$(dpkg --print-architecture 2>/dev/null || uname -m)"
[[ "$ARCH" == "arm64" || "$ARCH" == "aarch64" ]] || fail "需要 Raspberry Pi OS 64-bit (arm64)，目前架構：$ARCH"
command -v sudo >/dev/null || fail "找不到 sudo。"

if ! command -v curl >/dev/null || ! command -v openssl >/dev/null; then
  log "安裝基礎工具"
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl git openssl
fi

install_docker() {
  log "安裝 Docker Engine 與 Compose plugin"
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl git openssl
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc

  local codename
  codename="$(. /etc/os-release && printf '%s' "$VERSION_CODENAME")"
  [[ -n "$codename" ]] || fail "無法判斷作業系統版本代號。"

  printf '%s\n' \
    'Types: deb' \
    'URIs: https://download.docker.com/linux/debian' \
    "Suites: $codename" \
    'Components: stable' \
    "Architectures: $(dpkg --print-architecture)" \
    'Signed-By: /etc/apt/keyrings/docker.asc' |
    sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null

  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo systemctl enable --now docker
}

if ! command -v docker >/dev/null; then
  install_docker
else
  log "已偵測到 Docker，略過安裝"
  sudo systemctl enable --now docker
fi

if docker info >/dev/null 2>&1; then
  DOCKER=(docker)
else
  DOCKER=(sudo docker)
fi

"${DOCKER[@]}" compose version >/dev/null || fail "Docker Compose plugin 無法使用。"

if [[ ! -f "$ENV_FILE" ]]; then
  log "產生資料庫與 JWT 安全設定"
  POSTGRES_PASSWORD="$(openssl rand -hex 24)"
  SECRET_KEY="$(openssl rand -hex 32)"

  umask 077
  printf '%s\n' \
    "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" \
    "SECRET_KEY=$SECRET_KEY" \
    'SEED_INITIAL_DATA=true' \
    'SETUP_DEFAULT_CREDENTIALS=true' \
    'SEED_SAMPLE_PRODUCTS=false' > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
else
  log "保留既有 .env，不覆寫密碼或設定"
fi

umask 077
printf '%s\n' \
  'StallEasy POS 預設登入資料（backend/scripts/setup_defaults.py）' \
  '系統管理員：admin / PIN 000000' \
  '店主：owner / PIN 111111' > "$CREDENTIAL_FILE"
chmod 600 "$CREDENTIAL_FILE"

log "驗證 Compose 設定"
cd "$PROJECT_DIR"
"$PROJECT_DIR/scripts/linux/install-host-services.sh"
"${DOCKER[@]}" compose config --quiet

log "建置並啟動 StallEasy POS（第一次可能需要數分鐘）"
if ! "${DOCKER[@]}" compose build; then
  printf '\n若錯誤包含 IPv6「network is unreachable」，請執行：\n'
  printf '  ./scripts/linux/fix-docker-network.sh\n'
  exit 1
fi
"${DOCKER[@]}" compose up -d

log "執行服務健康測試"
DOCKER_CMD="${DOCKER[*]}" "$PROJECT_DIR/scripts/linux/smoke-test.sh"

PI_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
printf '\n安裝完成。\n'
printf 'POS 網址: http://%s:3000\n' "${PI_IP:-<Pi-IP>}"
printf 'API 文件: http://%s:8000/docs\n' "${PI_IP:-<Pi-IP>}"
printf '使用端口: Frontend=3000, Backend=8000（PostgreSQL 不對外開放）\n'
if [[ -f "$CREDENTIAL_FILE" ]]; then
  printf '首次登入密碼已儲存於：%s\n' "$CREDENTIAL_FILE"
fi

if [[ "${CREATE_DESKTOP_SHORTCUT:-true}" = "true" ]]; then
  "$PROJECT_DIR/scripts/linux/install-touch-input.sh"
  "$PROJECT_DIR/scripts/linux/install-desktop-launcher.sh"
fi

if ! docker info >/dev/null 2>&1; then
  sudo usermod -aG docker "$USER"
  printf '已將 %s 加入 docker 群組；下次登入後可不加 sudo 使用 Docker。\n' "$USER"
fi
