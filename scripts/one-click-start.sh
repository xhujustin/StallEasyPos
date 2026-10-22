#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -f "$PROJECT_DIR/.env" ]] || ! command -v docker >/dev/null 2>&1; then
  printf '[StallEasy POS] 偵測為首次執行，開始完整安裝...\n'
  exec "$PROJECT_DIR/scripts/install-raspberry-pi.sh"
fi

printf '[StallEasy POS] 啟動既有服務...\n'
exec "$PROJECT_DIR/scripts/start.sh"
