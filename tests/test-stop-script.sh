#!/usr/bin/env bash
set -Eeuo pipefail

TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT
FIXTURE="$TEST_ROOT/project"
MOCK_BIN="$TEST_ROOT/bin"
CALL_LOG="$TEST_ROOT/docker-calls"
mkdir -p "$FIXTURE/scripts" "$MOCK_BIN"

cp scripts/stop.sh "$FIXTURE/scripts/"
cp compose.yaml "$FIXTURE/"
printf 'SECRET_KEY=test\n' > "$FIXTURE/.env"

printf '#!/usr/bin/env bash\nprintf "%%s\\n" "$*" >> "%s"\nexit 0\n' "$CALL_LOG" > "$MOCK_BIN/docker"
printf '#!/usr/bin/env bash\nexit 1\n' > "$MOCK_BIN/sudo"
chmod +x "$MOCK_BIN/docker" "$MOCK_BIN/sudo"

OUTPUT="$(PATH="$MOCK_BIN:$PATH" "$FIXTURE/scripts/stop.sh")"
grep -q '^compose stop$' "$CALL_LOG"
grep -q '資料庫與上傳檔均已保留' <<< "$OUTPUT"

echo "PASS: 停止腳本只呼叫 compose stop，未刪除資料。"
