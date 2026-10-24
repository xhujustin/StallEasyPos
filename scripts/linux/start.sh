#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

pause_on_exit() {
  local exit_code=$?
  if [[ "$exit_code" -ne 0 ]]; then
    printf '\n[ERROR] 啟動失敗，請查看上方錯誤訊息。\n' >&2
  fi
  if [[ -t 0 && "${STALLEASY_NO_PAUSE:-0}" != "1" ]]; then
    printf '\n按 Enter 關閉視窗...'
    read -r _ || true
  fi
  return "$exit_code"
}
trap pause_on_exit EXIT

fail() {
  printf '[ERROR] %s\n' "$*" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "找不到 Docker，請先執行 ./scripts/linux/install-raspberry-pi.sh"
[[ -f "$PROJECT_DIR/.env" ]] || fail "找不到 .env，請先執行 ./scripts/linux/install-raspberry-pi.sh"

if docker info >/dev/null 2>&1; then
  DOCKER=(docker)
elif sudo docker info >/dev/null 2>&1; then
  DOCKER=(sudo docker)
else
  fail "Docker 服務未啟動或目前帳號沒有權限。"
fi

cd "$PROJECT_DIR"
"${DOCKER[@]}" compose config --quiet

printf '[StallEasy POS] 啟動服務...\n'
"${DOCKER[@]}" compose up -d --no-build

DOCKER_CMD="${DOCKER[*]}" "$PROJECT_DIR/scripts/linux/smoke-test.sh"

PI_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
printf '\n========== StallEasy POS 服務狀態 ==========\n'
"${DOCKER[@]}" compose ps
printf '\nStallEasy POS 已啟動。\n'
printf '\nRaspberry Pi IP: %s\n' "${PI_IP:-無法自動取得}"
printf 'POS 網址: http://%s:3000\n' "${PI_IP:-<Pi-IP>}"
printf 'API 文件: http://%s:8000/docs\n' "${PI_IP:-<Pi-IP>}"
printf '對外端口: 3000（前端）、8000（後端 API）\n'
printf 'PostgreSQL: 僅限 Docker 內部連線，不對區網開放\n'
printf '=============================================\n'

if [[ "${AUTO_OPEN_BROWSER:-true}" = "true" ]]; then
  if ! "$PROJECT_DIR/scripts/linux/open-kiosk.sh"; then
    printf '[WARNING] 自動開啟瀏覽器失敗，但 POS 服務仍正常運行。\n' >&2
  fi
fi
