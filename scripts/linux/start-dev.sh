#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$PROJECT_DIR/frontend"
printf '[StallEasy POS] 啟動前端開發伺服器（0.0.0.0:3000）...\n'
printf '區網裝置請開啟：http://<這台電腦的 IP>:3000\n'
exec npm run dev
