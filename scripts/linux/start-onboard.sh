#!/usr/bin/env bash
set -Eeuo pipefail

if [[ -z "${DISPLAY:-}" ]]; then
  printf '[WARNING] 沒有 XWayland DISPLAY；Onboard 無法使用 XInput。\n' >&2
  exit 1
fi
if ! command -v onboard >/dev/null 2>&1; then
  printf '[WARNING] 找不到 Onboard，請執行 ./scripts/linux/install-touch-input.sh\n' >&2
  exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAYOUT_FILE="$HOME/.local/share/onboard/layouts/zhuyin.onboard"
PYTHON_USER_SITE="$(python3 -m site --user-site)"
NEEDS_INSTALL=0
if [[ ! -f "$LAYOUT_FILE" ]] || ! cmp -s "$SCRIPT_DIR/../assets/onboard-zhuyin/zhuyin.onboard" "$LAYOUT_FILE"; then
  NEEDS_INSTALL=1
fi
for name in stalleasy_input.py stalleasy_english.py stalleasy_zhuyin.py; do
  if ! cmp -s "$SCRIPT_DIR/$name" "$PYTHON_USER_SITE/$name"; then
    NEEDS_INSTALL=1
  fi
done
if (( NEEDS_INSTALL )); then
  "$SCRIPT_DIR/install-zhuyin-layout.sh"
fi
if command -v fcitx5-remote >/dev/null 2>&1; then
  if ! fcitx5-remote -s chewing; then
    printf '[WARNING] 酷音尚未就緒；鍵帽可顯示，但中英文連動暫時無法使用。\n' >&2
  fi
fi
if ! gsettings list-schemas | grep -qx 'org.onboard'; then
  printf '[ERROR] 找不到 Onboard 設定結構 org.onboard。\n' >&2
  exit 1
fi
if ! gsettings set org.onboard layout "$LAYOUT_FILE"; then
  printf '[ERROR] 無法將 Onboard 切換到注音版面；請在桌面工作階段執行。\n' >&2
  exit 1
fi
ACTIVE_LAYOUT="$(gsettings get org.onboard layout)"
if [[ "$ACTIVE_LAYOUT" != "'$LAYOUT_FILE'" ]]; then
  printf '[ERROR] Onboard 仍使用 %s，預期為 %s\n' "$ACTIVE_LAYOUT" "$LAYOUT_FILE" >&2
  exit 1
fi
if pgrep -x onboard >/dev/null 2>&1; then
  printf '[INFO] 關閉可能以 Wayland 啟動的舊 Onboard 實例...\n'
  pkill -u "$(id -u)" -x onboard || true
  sleep 1
fi

printf '[StallEasy POS] 以 XWayland/X11 啟動 Onboard...\n'
GDK_BACKEND=x11 PYTHONPATH="$SCRIPT_DIR${PYTHONPATH:+:$PYTHONPATH}" \
  nohup onboard -l "$LAYOUT_FILE" >/tmp/stalleasy-onboard.log 2>&1 &
ONBOARD_PID=$!
disown || true
sleep 2
if ! kill -0 "$ONBOARD_PID" 2>/dev/null; then
  printf '[WARNING] Onboard 啟動後立即退出，請查看 /tmp/stalleasy-onboard.log\n' >&2
  exit 1
fi
printf '[StallEasy POS] Onboard 注音版面：%s\n' "$LAYOUT_FILE"
