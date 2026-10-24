#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if command -v xdg-user-dir >/dev/null 2>&1; then
  DESKTOP_DIR="$(xdg-user-dir DESKTOP)"
else
  DESKTOP_DIR="$HOME/Desktop"
fi
[[ -n "$DESKTOP_DIR" ]] || DESKTOP_DIR="$HOME/Desktop"
mkdir -p "$DESKTOP_DIR"

LAUNCHER="$DESKTOP_DIR/StallEasy-POS.desktop"
{
  printf '%s\n' '[Desktop Entry]'
  printf '%s\n' 'Type=Application'
  printf '%s\n' 'Name=StallEasy POS 一鍵啟動'
  printf '%s\n' 'Comment=安裝或啟動 StallEasy POS 並顯示服務狀態'
  printf 'Exec=bash -lc '\''%s/scripts/linux/one-click-start.sh'\''\n' "$PROJECT_DIR"
  printf 'Path=%s\n' "$PROJECT_DIR"
  printf '%s\n' 'Terminal=true'
  printf '%s\n' 'Categories=Utility;'
} > "$LAUNCHER"
chmod +x "$LAUNCHER"

AUTOSTART_DIR="$HOME/.config/autostart"
mkdir -p "$AUTOSTART_DIR"
AUTOSTART_FILE="$AUTOSTART_DIR/StallEasy-POS.desktop"
# Raspberry Pi OS labwc 使用下方原生 autostart；停用舊 XDG 項目以免重複啟動。
printf '%s\n' '[Desktop Entry]' 'Type=Application' 'Name=StallEasy POS' 'Hidden=true' > "$AUTOSTART_FILE"

LABWC_DIR="$HOME/.config/labwc"
LABWC_AUTOSTART="$LABWC_DIR/autostart"
mkdir -p "$LABWC_DIR"
START_MARKER='# StallEasy POS autostart'
if [[ -f "$LABWC_AUTOSTART" ]]; then
  sed -i '/^# StallEasy POS autostart$/,+1d' "$LABWC_AUTOSTART"
  # Clean up paths from releases before scripts were split by operating system.
  sed -i '\#StallEasyPos/scripts/open-on-login\.sh#d' "$LABWC_AUTOSTART"
fi
printf '\n%s\n' "$START_MARKER" >> "$LABWC_AUTOSTART"
printf '%q &\n' "$PROJECT_DIR/scripts/linux/open-on-login.sh" >> "$LABWC_AUTOSTART"

if command -v gio >/dev/null 2>&1; then
  gio set "$LAUNCHER" metadata::trusted true >/dev/null 2>&1 || true
fi

printf '桌面一鍵啟動圖示已建立：%s\n' "$LAUNCHER"
printf 'labwc 登入後瀏覽器自啟已建立：%s\n' "$LABWC_AUTOSTART"
