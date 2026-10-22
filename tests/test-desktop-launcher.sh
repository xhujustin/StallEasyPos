#!/usr/bin/env bash
set -Eeuo pipefail

TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT
FIXTURE="$TEST_ROOT/project"
mkdir -p "$FIXTURE/scripts"
cp scripts/install-desktop-launcher.sh "$FIXTURE/scripts/"
chmod +x "$FIXTURE/scripts/install-desktop-launcher.sh"

HOME="$TEST_ROOT/home" PATH="/usr/bin:/bin" "$FIXTURE/scripts/install-desktop-launcher.sh" >/dev/null
LAUNCHER="$TEST_ROOT/home/Desktop/StallEasy-POS.desktop"
[[ -x "$LAUNCHER" ]]
grep -q '^Terminal=true$' "$LAUNCHER"
grep -q "$FIXTURE/scripts/one-click-start.sh" "$LAUNCHER"
grep -q '^Hidden=true$' "$TEST_ROOT/home/.config/autostart/StallEasy-POS.desktop"
grep -q '# StallEasy POS autostart' "$TEST_ROOT/home/.config/labwc/autostart"
grep -q 'open-on-login.sh' "$TEST_ROOT/home/.config/labwc/autostart"

echo "PASS: Raspberry Pi 桌面一鍵啟動圖示內容與權限正常。"
