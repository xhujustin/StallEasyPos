#!/usr/bin/env bash
set -Eeuo pipefail

TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT
FIXTURE="$TEST_ROOT/project"
MOCK_BIN="$TEST_ROOT/bin"
mkdir -p "$FIXTURE/scripts" "$MOCK_BIN"

cp scripts/install-raspberry-pi.sh scripts/install-desktop-launcher.sh scripts/install-host-services.sh scripts/install-touch-input.sh scripts/smoke-test.sh "$FIXTURE/scripts/"
cp compose.yaml "$FIXTURE/"

make_mock() {
  local name="$1" body="$2"
  printf '#!/usr/bin/env bash\n%s\n' "$body" > "$MOCK_BIN/$name"
  chmod +x "$MOCK_BIN/$name"
}

make_mock dpkg '[[ "${1:-}" == "--print-architecture" ]] && printf "arm64\n"'
make_mock docker 'exit 0'
make_mock sudo 'exit 0'
make_mock curl 'exit 0'
make_mock hostname '[[ "${1:-}" == "-I" ]] && printf "192.168.1.50 \n"'
make_mock openssl 'printf "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef\n"'

HOME="$TEST_ROOT/home" PATH="$MOCK_BIN:$PATH" "$FIXTURE/scripts/install-raspberry-pi.sh" >/dev/null

[[ -f "$FIXTURE/.env" ]] || { echo "FAIL: .env 未建立"; exit 1; }
[[ -f "$FIXTURE/.initial-credentials" ]] || { echo "FAIL: 登入資料未建立"; exit 1; }
[[ "$(stat -c '%a' "$FIXTURE/.env")" == "600" ]] || { echo "FAIL: .env 權限不是 600"; exit 1; }
grep -q '^POSTGRES_PASSWORD=' "$FIXTURE/.env"
grep -q '^SETUP_DEFAULT_CREDENTIALS=true' "$FIXTURE/.env"
grep -q 'admin / PIN 000000' "$FIXTURE/.initial-credentials"
grep -q 'owner / PIN 111111' "$FIXTURE/.initial-credentials"

BEFORE="$(sha256sum "$FIXTURE/.env")"
HOME="$TEST_ROOT/home" PATH="$MOCK_BIN:$PATH" "$FIXTURE/scripts/install-raspberry-pi.sh" >/dev/null
AFTER="$(sha256sum "$FIXTURE/.env")"
[[ "$BEFORE" == "$AFTER" ]] || { echo "FAIL: 重跑時覆寫了 .env"; exit 1; }

echo "PASS: ARM64 安裝流程、秘密檔權限與重跑保護均正常。"
