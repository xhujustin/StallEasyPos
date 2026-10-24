#!/usr/bin/env bash
set -Eeuo pipefail

TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT
FIXTURE="$TEST_ROOT/project"
MOCK_BIN="$TEST_ROOT/bin"
CALL_LOG="$TEST_ROOT/calls"
mkdir -p "$FIXTURE/scripts/linux" "$MOCK_BIN"

cp scripts/linux/repair-login.sh "$FIXTURE/scripts/linux/"
cp compose.yaml "$FIXTURE/"
printf 'SECRET_KEY=test\n' > "$FIXTURE/.env"

printf '#!/usr/bin/env bash\nprintf "docker %%s\\n" "$*" >> "%s"\nexit 0\n' "$CALL_LOG" > "$MOCK_BIN/docker"
printf '#!/usr/bin/env bash\nexit 1\n' > "$MOCK_BIN/sudo"
printf '#!/usr/bin/env bash\nprintf '\''{"data":{"access_token":"test"}}'\''\n' > "$MOCK_BIN/curl"
printf '#!/usr/bin/env bash\nprintf "192.168.1.50 \\n"\n' > "$MOCK_BIN/hostname"
chmod +x "$MOCK_BIN/"*

OUTPUT="$(PATH="$MOCK_BIN:$PATH" "$FIXTURE/scripts/linux/repair-login.sh")"
grep -q 'python scripts/setup_defaults.py' "$CALL_LOG"
grep -q '\[PASS\] admin / 000000' <<< "$OUTPUT"
grep -q '\[PASS\] owner / 111111' <<< "$OUTPUT"

echo "PASS: 登入修復會套用原始預設值並驗證兩組 API 登入。"
