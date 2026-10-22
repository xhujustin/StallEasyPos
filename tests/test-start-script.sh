#!/usr/bin/env bash
set -Eeuo pipefail

TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT
FIXTURE="$TEST_ROOT/project"
MOCK_BIN="$TEST_ROOT/bin"
mkdir -p "$FIXTURE/scripts" "$MOCK_BIN"

cp scripts/start.sh scripts/smoke-test.sh scripts/open-kiosk.sh "$FIXTURE/scripts/"
cp compose.yaml "$FIXTURE/"
printf 'SECRET_KEY=test\n' > "$FIXTURE/.env"

make_mock() {
  local name="$1" body="$2"
  printf '#!/usr/bin/env bash\n%s\n' "$body" > "$MOCK_BIN/$name"
  chmod +x "$MOCK_BIN/$name"
}

make_mock docker 'exit 0'
make_mock sudo 'exit 1'
make_mock curl 'exit 0'
make_mock hostname '[[ "${1:-}" == "-I" ]] && printf "192.168.1.50 \n"'

OUTPUT="$(AUTO_OPEN_BROWSER=false PATH="$MOCK_BIN:$PATH" "$FIXTURE/scripts/start.sh")"
grep -q 'StallEasy POS 已啟動' <<< "$OUTPUT"
grep -q 'http://192.168.1.50:3000' <<< "$OUTPUT"

echo "PASS: 日常啟動流程與網址輸出正常。"
