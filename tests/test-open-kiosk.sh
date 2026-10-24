#!/usr/bin/env bash
set -Eeuo pipefail

TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT
MOCK_BIN="$TEST_ROOT/bin"
CALL_LOG="$TEST_ROOT/browser-call"
mkdir -p "$MOCK_BIN" "$TEST_ROOT/home"

printf '#!/usr/bin/env bash\nprintf "%%s\\n" "$*" > "%s"\n' "$CALL_LOG" > "$MOCK_BIN/chromium"
chmod +x "$MOCK_BIN/chromium"

HOME="$TEST_ROOT/home" WAYLAND_DISPLAY=wayland-0 PATH="$MOCK_BIN:/usr/bin:/bin" \
  scripts/linux/open-kiosk.sh

for attempt in {1..20}; do
  [[ -f "$CALL_LOG" ]] && break
  sleep 0.1
done

if grep -q -- '--kiosk' "$CALL_LOG"; then
  echo "FAIL: kiosk 會阻擋 Wayland 虛擬鍵盤" >&2
  exit 1
fi
grep -q -- '--start-maximized' "$CALL_LOG"
grep -q -- '--ozone-platform=x11' "$CALL_LOG"
grep -q -- '--app=http://127.0.0.1:3000' "$CALL_LOG"
grep -q -- "--user-data-dir=$TEST_ROOT/home/.config/stalleasy-onboard" "$CALL_LOG"

echo "PASS: Chromium 以支援 Onboard/Fcitx5 的 XWayland 應用視窗開啟 POS。"
