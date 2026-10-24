#!/usr/bin/env bash
set -Eeuo pipefail

URL="${STALLEASY_POS_URL:-http://127.0.0.1:3000}"

if [[ -z "${WAYLAND_DISPLAY:-}" ]]; then
  printf '[INFO] 未偵測到桌面圖形環境，略過自動開啟瀏覽器。\n'
  exit 0
fi

BROWSER=""
for candidate in chromium chromium-browser google-chrome google-chrome-stable; do
  if command -v "$candidate" >/dev/null 2>&1; then
    BROWSER="$candidate"
    break
  fi
done

if [[ -z "$BROWSER" ]]; then
  printf '[WARNING] 找不到 Chromium/Chrome，POS 已啟動但無法自動開啟全螢幕。\n' >&2
  printf '可執行：sudo apt update && sudo apt install -y chromium\n' >&2
  exit 0
fi

PROFILE_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/stalleasy-onboard"
mkdir -p "$PROFILE_DIR"
export GTK_IM_MODULE=fcitx
export QT_IM_MODULE=fcitx
export XMODIFIERS=@im=fcitx

# Onboard sends X11 key events; Chromium must run through XWayland as well.
if command -v fcitx5 >/dev/null 2>&1 && ! pgrep -x fcitx5 >/dev/null 2>&1; then
  fcitx5 -d --replace >/tmp/stalleasy-fcitx5.log 2>&1 || true
fi
"$(dirname "${BASH_SOURCE[0]}")/start-onboard.sh" || true
printf '[StallEasy POS] 使用 %s 開啟無邊框應用視窗：%s\n' "$BROWSER" "$URL"
nohup "$BROWSER" \
  --start-maximized \
  --app="$URL" \
  --ozone-platform=x11 \
  --user-data-dir="$PROFILE_DIR" \
  --no-first-run \
  --disable-session-crashed-bubble \
  --disable-infobars \
  >/tmp/stalleasy-kiosk.log 2>&1 &
disown || true
