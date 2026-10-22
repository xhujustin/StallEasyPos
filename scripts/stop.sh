#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

pause_on_exit() {
  local exit_code=$?
  if [[ "$exit_code" -ne 0 ]]; then
    printf '\n[ERROR] 停止服務失敗，請查看上方錯誤訊息。\n' >&2
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

command -v docker >/dev/null 2>&1 || fail "找不到 Docker。"
[[ -f "$PROJECT_DIR/.env" ]] || fail "找不到 .env，無法確認 StallEasy POS 專案設定。"

if docker info >/dev/null 2>&1; then
  DOCKER=(docker)
elif sudo docker info >/dev/null 2>&1; then
  DOCKER=(sudo docker)
else
  fail "Docker 服務未啟動或目前帳號沒有權限。"
fi

cd "$PROJECT_DIR"
printf '[StallEasy POS] 正在停止服務...\n'
"${DOCKER[@]}" compose stop

printf '\nStallEasy POS 已停止。資料庫與上傳檔均已保留。\n'
printf '需要再次啟動時請執行：./scripts/start.sh\n'
