#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_FILE="${XDG_STATE_HOME:-$HOME/.local/state}/stalleasy/browser-autostart.log"
mkdir -p "$(dirname "$LOG_FILE")"
exec >>"$LOG_FILE" 2>&1

printf '\n[%s] 桌面登入，等待 POS 前端就緒...\n' "$(date -Is)"
for attempt in {1..90}; do
  if curl --fail --silent --max-time 3 http://127.0.0.1:3000/ >/dev/null 2>&1; then
    printf '[%s] 前端已就緒，開啟瀏覽器。\n' "$(date -Is)"
    exec "$PROJECT_DIR/scripts/linux/open-kiosk.sh"
  fi
  sleep 2
done

printf '[%s] 前端 180 秒內未就緒；請檢查 docker compose ps。\n' "$(date -Is)" >&2
exit 1
