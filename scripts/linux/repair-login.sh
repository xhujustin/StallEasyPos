#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

pause_on_exit() {
  local exit_code=$?
  if [[ "$exit_code" -ne 0 ]]; then
    printf '\n[ERROR] 登入修復未完成，請保留並回報上方輸出。\n' >&2
  fi
  if [[ -t 0 && "${STALLEASY_NO_PAUSE:-0}" != "1" ]]; then
    printf '\n按 Enter 關閉視窗...'
    read -r _ || true
  fi
  return "$exit_code"
}
trap pause_on_exit EXIT

fail() { printf '[ERROR] %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || fail "找不到 Docker。"
command -v curl >/dev/null 2>&1 || fail "找不到 curl。"
[[ -f "$PROJECT_DIR/.env" ]] || fail "找不到 .env，請先執行一鍵安裝。"

if docker info >/dev/null 2>&1; then
  DOCKER=(docker)
elif sudo docker info >/dev/null 2>&1; then
  DOCKER=(sudo docker)
else
  fail "Docker 服務未啟動或目前帳號沒有權限。"
fi

cd "$PROJECT_DIR"
printf '[1/4] 啟動資料庫與後端...\n'
"${DOCKER[@]}" compose up -d db backend

if ! "${DOCKER[@]}" compose exec -T backend test -f scripts/setup_defaults.py; then
  printf '[INFO] Backend 是舊映像，現在重新建置...\n'
  "${DOCKER[@]}" compose build backend
  "${DOCKER[@]}" compose up -d --force-recreate backend
fi

printf '[2/4] 依原始 setup_defaults.py 重設帳號、權限與 PIN...\n'
"${DOCKER[@]}" compose exec -T backend python scripts/setup_defaults.py

printf '[3/4] 等待 Backend API...\n'
for attempt in {1..30}; do
  if curl --fail --silent --max-time 5 http://127.0.0.1:8000/ >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then
    "${DOCKER[@]}" compose logs --tail=100 backend >&2 || true
    fail "Backend API 未就緒。"
  fi
  sleep 2
done

test_login() {
  local username="$1" pin="$2" response_file
  response_file="$(mktemp)"
  if curl --fail --silent --show-error --max-time 10 \
    -X POST 'http://127.0.0.1:8000/api/v1/auth/login' \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "username=$username" \
    --data-urlencode "password=$pin" > "$response_file" &&
    grep -q 'access_token' "$response_file"; then
    rm -f "$response_file"
    printf '[PASS] %s / %s API 登入成功。\n' "$username" "$pin"
    return 0
  fi
  printf '[FAIL] %s / %s API 登入失敗，回應：\n' "$username" "$pin" >&2
  sed -n '1,20p' "$response_file" >&2
  rm -f "$response_file"
  return 1
}

printf '[4/4] 直接測試登入 API...\n'
ADMIN_OK=0
OWNER_OK=0
test_login admin 000000 || ADMIN_OK=1
test_login owner 111111 || OWNER_OK=1

if [[ "$ADMIN_OK" -ne 0 || "$OWNER_OK" -ne 0 ]]; then
  "${DOCKER[@]}" compose logs --tail=100 backend >&2 || true
  fail "至少一組預設帳號仍無法通過 API 驗證。"
fi

PI_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
printf '\n登入資料已修復並經 API 驗證成功：\n'
printf '  系統管理員：admin / 000000\n'
printf '  店主：owner / 111111\n'
printf '  登入網址：http://%s:3000/login\n' "${PI_IP:-<Pi-IP>}"
printf '\n登入畫面的「店鋪帳號」欄請輸入英文字母 admin 或 owner，不是店名。\n'
