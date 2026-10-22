#!/usr/bin/env bash
set -Eeuo pipefail

printf '[StallEasy POS] 安裝 Onboard 螢幕鍵盤...\n'
sudo apt-get update
sudo apt-get install -y onboard at-spi2-core gir1.2-atspi-2.0
"$(dirname "${BASH_SOURCE[0]}")/install-zhuyin-layout.sh"

# Raspberry Pi OS built-in Squeekboard auto-popup conflicts with Onboard.
if command -v raspi-config >/dev/null 2>&1; then
  printf '[StallEasy POS] 停用 Squeekboard 自動彈出，保留 Onboard...\n'
  sudo raspi-config nonint do_squeekboard S3
fi

printf '[StallEasy POS] 安裝繁體中文輸入法（Fcitx5 + Chewing）...\n'
if ! sudo apt-get install -y fcitx5 fcitx5-chewing fcitx5-config-qt fcitx5-frontend-gtk3 im-config; then
  printf '[WARNING] 此 Raspberry Pi OS 套件庫沒有完整 Fcitx5 套件，虛擬鍵盤仍可使用。\n' >&2
fi

if command -v im-config >/dev/null 2>&1; then
  im-config -n fcitx5 || true
fi

FCITX_DIR="$HOME/.config/fcitx5"
mkdir -p "$FCITX_DIR"
if [[ -f "$FCITX_DIR/profile" ]] && grep -q '^Name=chewing$' "$FCITX_DIR/profile"; then
  printf '[INFO] 偵測到既有酷音設定，保留原 Fcitx5 profile。\n'
else
  if [[ -f "$FCITX_DIR/profile" && ! -f "$FCITX_DIR/profile.stalleasy-backup" ]]; then
    cp "$FCITX_DIR/profile" "$FCITX_DIR/profile.stalleasy-backup"
  fi
  printf '%s\n' \
    '[Groups/0]' \
    'Name=Default' \
    'Default Layout=us' \
    'DefaultIM=keyboard-us' \
    '' \
    '[Groups/0/Items/0]' \
    'Name=keyboard-us' \
    'Layout=' \
    '' \
    '[Groups/0/Items/1]' \
    'Name=chewing' \
    'Layout=' \
    '' \
    '[GroupOrder]' \
    '0=Default' > "$FCITX_DIR/profile"
  printf '[INFO] 已設定 Fcitx5：英文鍵盤 + Chewing 注音。\n'
fi

CONFIG_DIR="$HOME/.config/environment.d"
mkdir -p "$CONFIG_DIR"
printf '%s\n' \
  'GTK_IM_MODULE=fcitx' \
  'QT_IM_MODULE=fcitx' \
  'XMODIFIERS=@im=fcitx' > "$CONFIG_DIR/90-stalleasy-input.conf"

printf '觸控鍵盤與輸入法已配置；登出再登入或重新開機後完整生效。\n'
printf 'Fcitx5 預設切換快捷鍵為 Ctrl+Space。\n'

if command -v raspi-config >/dev/null 2>&1; then
  printf '[StallEasy POS] 設定開機自動登入桌面...\n'
  if ! sudo raspi-config nonint do_boot_behaviour B4; then
    printf '[WARNING] 請在 raspi-config 的 System Options > Boot 選擇 Desktop Autologin。\n' >&2
  fi
fi
