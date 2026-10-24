#!/usr/bin/env bash
set -Eeuo pipefail

TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT
FIXTURE="$TEST_ROOT/project"
MOCK_BIN="$TEST_ROOT/bin"
mkdir -p "$FIXTURE/scripts/linux" "$MOCK_BIN"

cp scripts/linux/one-click-start.sh "$FIXTURE/scripts/linux/"
printf '#!/usr/bin/env bash\nprintf "install\\n"\n' > "$FIXTURE/scripts/linux/install-raspberry-pi.sh"
printf '#!/usr/bin/env bash\nprintf "start\\n"\n' > "$FIXTURE/scripts/linux/start.sh"
printf '#!/usr/bin/env bash\nexit 0\n' > "$MOCK_BIN/docker"
chmod +x "$FIXTURE/scripts/linux/"*.sh "$MOCK_BIN/docker"

FIRST="$(PATH="/usr/bin:/bin" "$FIXTURE/scripts/linux/one-click-start.sh")"
grep -q '^install$' <<< "$(printf '%s\n' "$FIRST" | tail -1)"

printf 'SECRET_KEY=test\n' > "$FIXTURE/.env"
SECOND="$(PATH="$MOCK_BIN:/usr/bin:/bin" "$FIXTURE/scripts/linux/one-click-start.sh")"
grep -q '^start$' <<< "$(printf '%s\n' "$SECOND" | tail -1)"

echo "PASS: 一鍵入口可正確分流首次安裝與日常啟動。"
