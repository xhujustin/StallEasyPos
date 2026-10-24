#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTROL_DIR="/var/lib/stalleasy/control"

sudo install -d -m 0777 "$CONTROL_DIR"
sudo install -d -m 0777 "$CONTROL_DIR/printer"

printf '%s\n' \
  '[Unit]' \
  'Description=StallEasy POS graceful shutdown request' \
  '' \
  '[Service]' \
  'Type=oneshot' \
  "ExecStart=/usr/bin/rm -f $CONTROL_DIR/shutdown.request" \
  'ExecStart=/usr/bin/systemctl poweroff' |
  sudo tee /etc/systemd/system/stalleasy-shutdown.service >/dev/null

printf '%s\n' \
  '[Unit]' \
  'Description=Watch for StallEasy POS shutdown requests' \
  '' \
  '[Path]' \
  "PathExists=$CONTROL_DIR/shutdown.request" \
  'Unit=stalleasy-shutdown.service' \
  '' \
  '[Install]' \
  'WantedBy=multi-user.target' |
  sudo tee /etc/systemd/system/stalleasy-shutdown.path >/dev/null

printf '%s\n' \
  '[Unit]' \
  'Description=Start StallEasy POS containers on boot' \
  'Requires=docker.service' \
  'After=docker.service network-online.target' \
  'Wants=network-online.target' \
  '' \
  '[Service]' \
  'Type=oneshot' \
  "WorkingDirectory=$PROJECT_DIR" \
  "ExecStart=/usr/bin/docker compose up -d --no-build" \
  "ExecStop=/usr/bin/docker compose stop" \
  'RemainAfterExit=yes' \
  '' \
  '[Install]' \
  'WantedBy=multi-user.target' |
sudo tee /etc/systemd/system/stalleasy-pos.service >/dev/null

printf '%s\n' \
  '[Unit]' \
  'Description=StallEasy POS printer and cash drawer bridge' \
  'After=network-online.target' \
  'Wants=network-online.target' \
  '' \
  '[Service]' \
  'Type=simple' \
  "ExecStart=/usr/bin/python3 $PROJECT_DIR/scripts/stalleasy_hardware.py" \
  'Restart=always' \
  'RestartSec=2' \
  '' \
  '[Install]' \
  'WantedBy=multi-user.target' |
  sudo tee /etc/systemd/system/stalleasy-hardware.service >/dev/null

sudo systemctl daemon-reload
sudo systemctl enable --now stalleasy-shutdown.path
sudo systemctl enable stalleasy-pos.service
sudo systemctl enable --now stalleasy-hardware.service
printf '主機關機監看與開機自啟服務已安裝。\n'
