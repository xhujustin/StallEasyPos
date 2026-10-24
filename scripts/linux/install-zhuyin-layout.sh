#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_DIR="$PROJECT_DIR/assets/onboard-zhuyin"
LAYOUT_DIR="$HOME/.local/share/onboard/layouts"
mkdir -p "$LAYOUT_DIR"

for name in zhuyin.onboard zhuyin-Alpha.svg zhuyin-Numbers.svg zhuyin-Utils.svg; do
  source_file="$SOURCE_DIR/$name"
  target_file="$LAYOUT_DIR/$name"
  [[ -f "$source_file" ]] || {
    printf '[ERROR] 缺少注音版面檔：%s\n' "$source_file" >&2
    exit 1
  }
  if [[ -f "$target_file" && ! -f "$target_file.stalleasy-backup" ]]; then
    cp "$target_file" "$target_file.stalleasy-backup"
  fi
  install -m 0644 "$source_file" "$target_file"
done

# Onboard may be started by the desktop instead of our kiosk script. Install
# the action modules on the user's normal Python import path as well.
PYTHON_USER_SITE="$(python3 -m site --user-site)"
mkdir -p "$PYTHON_USER_SITE"
for name in stalleasy_input.py stalleasy_english.py stalleasy_zhuyin.py; do
  install -m 0644 "$PROJECT_DIR/scripts/$name" "$PYTHON_USER_SITE/$name"
done

printf 'Onboard 注音鍵帽版面已安裝：%s\n' "$LAYOUT_DIR/zhuyin.onboard"
