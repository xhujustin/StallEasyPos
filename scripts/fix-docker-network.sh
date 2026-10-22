#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

pause_on_exit() {
  local exit_code=$?
  if [[ "$exit_code" -ne 0 ]]; then
    printf '\n[ERROR] 網路修復或建置未完成，請查看上方訊息。\n' >&2
  fi
  if [[ -t 0 && "${STALLEASY_NO_PAUSE:-0}" != "1" ]]; then
    printf '\n按 Enter 關閉視窗...'
    read -r _ || true
  fi
  return "$exit_code"
}
trap pause_on_exit EXIT

fail() { printf '[ERROR] %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || fail "找不到 Docker，請先執行安裝腳本。"
command -v curl >/dev/null 2>&1 || fail "找不到 curl。"
[[ -f "$PROJECT_DIR/.env" ]] || fail "找不到 .env，請先執行安裝腳本。"

printf '[1/5] 測試 Docker Hub 的 IPv4 連線...\n'
if ! curl -4 --fail --silent --show-error --max-time 20 \
  'https://auth.docker.io/token?service=registry.docker.io' >/dev/null; then
  fail "IPv4 也無法連到 Docker Hub。請先檢查網路、DNS、路由器防火牆或公司網路限制；尚未更改 IPv6 設定。"
fi

printf '[2/6] 停用無法使用的 IPv6 路徑，並讓系統優先選擇 IPv4...\n'
printf '%s\n' \
  '# StallEasy POS: Docker Hub IPv6 fallback' \
  'net.ipv6.conf.all.disable_ipv6 = 1' \
  'net.ipv6.conf.default.disable_ipv6 = 1' |
sudo tee /etc/sysctl.d/99-stalleasy-disable-ipv6.conf >/dev/null
sudo sysctl --system >/dev/null

if ! grep -Eq '^[[:space:]]*precedence[[:space:]]+::ffff:0:0/96[[:space:]]+100' /etc/gai.conf 2>/dev/null; then
  printf '%s\n' 'precedence ::ffff:0:0/96  100' | sudo tee -a /etc/gai.conf >/dev/null
fi

printf '[3/6] 強制 Docker daemon 使用系統 DNS 位址排序...\n'
sudo install -d -m 0755 /etc/systemd/system/docker.service.d
printf '%s\n' \
  '[Service]' \
  'Environment="GODEBUG=netdns=cgo"' |
  sudo tee /etc/systemd/system/docker.service.d/10-ipv4-dns.conf >/dev/null

printf '[4/6] 重載 systemd 並重新啟動 Docker...\n'
sudo systemctl daemon-reload
sudo systemctl restart docker

if docker info >/dev/null 2>&1; then
  DOCKER=(docker)
else
  DOCKER=(sudo docker)
fi

printf '[5/6] 透過 IPv4 拉取 ARM64 基底映像...\n'
"${DOCKER[@]}" pull node:22-alpine
"${DOCKER[@]}" pull python:3.12-slim
"${DOCKER[@]}" pull postgres:17-alpine

printf '[6/6] 重新建置並啟動 StallEasy POS...\n'
cd "$PROJECT_DIR"
"${DOCKER[@]}" compose build
"${DOCKER[@]}" compose up -d
DOCKER_CMD="${DOCKER[*]}" "$PROJECT_DIR/scripts/smoke-test.sh"

PI_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
printf '\nDocker 網路已修復，StallEasy POS 已啟動。\n'
printf 'POS 網址: http://%s:3000\n' "${PI_IP:-<Pi-IP>}"
printf 'API 文件: http://%s:8000/docs\n' "${PI_IP:-<Pi-IP>}"
