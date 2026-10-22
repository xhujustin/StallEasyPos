#!/usr/bin/env bash
set -Eeuo pipefail

TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT
FIXTURE="$TEST_ROOT/project"
MOCK_BIN="$TEST_ROOT/bin"
CALL_LOG="$TEST_ROOT/calls"
mkdir -p "$FIXTURE/scripts" "$MOCK_BIN"

cp scripts/fix-docker-network.sh scripts/smoke-test.sh "$FIXTURE/scripts/"
cp compose.yaml "$FIXTURE/"
printf 'SECRET_KEY=test\n' > "$FIXTURE/.env"

make_mock() {
  local name="$1" body="$2"
  printf '#!/usr/bin/env bash\n%s\n' "$body" > "$MOCK_BIN/$name"
  chmod +x "$MOCK_BIN/$name"
}

make_mock curl 'exit 0'
make_mock docker "printf 'docker %s\\n' \"\$*\" >> '$CALL_LOG'; exit 0"
make_mock sudo "printf 'sudo %s\\n' \"\$*\" >> '$CALL_LOG'; exit 0"
make_mock hostname 'printf "192.168.1.50 \n"'

OUTPUT="$(PATH="$MOCK_BIN:$PATH" "$FIXTURE/scripts/fix-docker-network.sh")"
grep -q 'docker pull node:22-alpine' "$CALL_LOG"
grep -q 'docker compose build' "$CALL_LOG"
grep -q 'sudo systemctl daemon-reload' "$CALL_LOG"
grep -q 'sudo systemctl restart docker' "$CALL_LOG"
grep -q 'Docker 網路已修復' <<< "$OUTPUT"

echo "PASS: IPv4 修復、映像拉取與重新建置流程正常。"
