#!/usr/bin/env bash
set -Eeuo pipefail

grep -q 'apt-get install -y onboard' scripts/linux/install-touch-input.sh
grep -q 'install-zhuyin-layout.sh' scripts/linux/install-touch-input.sh
grep -q 'onboard -l zhuyin' scripts/linux/start-onboard.sh
grep -q 'do_squeekboard S3' scripts/linux/install-touch-input.sh
grep -q 'at-spi2-core' scripts/linux/install-touch-input.sh
grep -q 'GDK_BACKEND=x11 nohup onboard' scripts/linux/start-onboard.sh
grep -q 'fcitx5-chewing' scripts/linux/install-touch-input.sh
grep -q 'fcitx5-frontend-gtk3' scripts/linux/install-touch-input.sh
grep -q "'Name=chewing'" scripts/linux/install-touch-input.sh
grep -q 'fcitx5-remote -s' scripts/linux/set-input-method.sh
grep -q 'im-config -n fcitx5' scripts/linux/install-touch-input.sh
grep -q 'GTK_IM_MODULE=fcitx' scripts/linux/install-touch-input.sh
grep -q 'do_boot_behaviour B4' scripts/linux/install-touch-input.sh
grep -A8 'value={username}' 'frontend/src/app/(public)/login/page.tsx' | grep -q 'inputMode="text"'
if ! grep -A6 'value={pin}' 'frontend/src/app/(public)/login/page.tsx' | grep -q 'readOnly'; then
  echo 'FAIL: PIN 欄沒有維持 readOnly' >&2
  exit 1
fi
echo "PASS: 店鋪帳號支援文字輸入法，PIN 維持唯讀數字鍵盤。"
