#!/usr/bin/env bash
set -Eeuo pipefail

grep -q 'CONTROL_DIR="/var/lib/stalleasy/control"' scripts/install-host-services.sh
grep -q 'PathExists=\$CONTROL_DIR/shutdown.request' scripts/install-host-services.sh
grep -q 'ExecStart=/usr/bin/systemctl poweroff' scripts/install-host-services.sh
grep -q 'ExecStart=/usr/bin/docker compose up -d --no-build' scripts/install-host-services.sh
grep -q 'stalleasy-pos.service' scripts/install-host-services.sh
grep -q '/var/lib/stalleasy/control:/app/host-control' compose.yaml

echo "PASS: 關機監看與開機自啟 systemd 設定完整。"
