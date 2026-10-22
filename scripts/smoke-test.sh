#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKER_CMD="${DOCKER_CMD:-docker}"
read -r -a DOCKER <<< "$DOCKER_CMD"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-30}"
WAIT_SECONDS="${WAIT_SECONDS:-5}"

cd "$PROJECT_DIR"

for ((attempt=1; attempt<=MAX_ATTEMPTS; attempt++)); do
  if curl --fail --silent --show-error --max-time 5 http://127.0.0.1:8000/ >/dev/null 2>&1 &&
     curl --fail --silent --show-error --max-time 5 http://127.0.0.1:3000/ >/dev/null 2>&1; then
    printf '[PASS] Backend API 與 Frontend 均可連線。\n'
    "${DOCKER[@]}" compose ps
    exit 0
  fi
  printf '[WAIT] 等待服務啟動 (%d/%d)...\n' "$attempt" "$MAX_ATTEMPTS"
  sleep "$WAIT_SECONDS"
done

printf '[FAIL] 服務未在預期時間內就緒，最近日誌如下：\n' >&2
"${DOCKER[@]}" compose ps >&2 || true
"${DOCKER[@]}" compose logs --tail=100 backend frontend db >&2 || true
exit 1
