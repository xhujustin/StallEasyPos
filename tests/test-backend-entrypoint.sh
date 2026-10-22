#!/usr/bin/env bash
set -Eeuo pipefail

TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT
MOCK_BIN="$TEST_ROOT/bin"
CALL_LOG="$TEST_ROOT/calls"
mkdir -p "$MOCK_BIN"

printf '#!/usr/bin/env bash\nprintf "alembic %%s\\n" "$*" >> "%s"\n' "$CALL_LOG" > "$MOCK_BIN/alembic"
printf '#!/usr/bin/env bash\nprintf "python %%s\\n" "$*" >> "%s"\n' "$CALL_LOG" > "$MOCK_BIN/python"
chmod +x "$MOCK_BIN/alembic" "$MOCK_BIN/python"

PATH="$MOCK_BIN:$PATH" SEED_INITIAL_DATA=true SETUP_DEFAULT_CREDENTIALS=true \
  SEED_SAMPLE_PRODUCTS=false backend/docker-entrypoint.sh true >/dev/null

EXPECTED="$TEST_ROOT/expected"
printf '%s\n' \
  'alembic upgrade head' \
  'python scripts/check_db.py' \
  'python -m app.initial_data' \
  'python scripts/setup_defaults.py' > "$EXPECTED"

diff -u "$EXPECTED" "$CALL_LOG"
grep -q '^COPY scripts ./scripts$' backend/Dockerfile
echo "PASS: Docker 依序執行遷移、檢查、店鋪初始化與原預設帳密。"
