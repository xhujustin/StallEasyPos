#!/usr/bin/env bash
set -Eeuo pipefail

TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT
FIXTURE="$TEST_ROOT/project"
mkdir -p "$FIXTURE/scripts/linux"
cp scripts/linux/install-desktop-launcher.sh "$FIXTURE/scripts/linux/"
chmod +x "$FIXTURE/scripts/linux/install-desktop-launcher.sh"
mkdir -p "$TEST_ROOT/home/.config/labwc"
printf '%s\n' '# StallEasy POS autostart' "$FIXTURE/scripts/open-on-login.sh &" > "$TEST_ROOT/home/.config/labwc/autostart"

HOME="$TEST_ROOT/home" PATH="/usr/bin:/bin" "$FIXTURE/scripts/linux/install-desktop-launcher.sh" >/dev/null
LAUNCHER="$TEST_ROOT/home/Desktop/StallEasy-POS.desktop"
[[ -x "$LAUNCHER" ]]
grep -q '^Terminal=true$' "$LAUNCHER"
grep -q "$FIXTURE/scripts/linux/one-click-start.sh" "$LAUNCHER"
grep -q '^Hidden=true$' "$TEST_ROOT/home/.config/autostart/StallEasy-POS.desktop"
grep -q '# StallEasy POS autostart' "$TEST_ROOT/home/.config/labwc/autostart"
grep -q 'open-on-login.sh' "$TEST_ROOT/home/.config/labwc/autostart"
! grep -q 'scripts/open-on-login.sh' "$TEST_ROOT/home/.config/labwc/autostart"

echo "PASS: Raspberry Pi 桌面一鍵啟動圖示內容與權限正常。"
