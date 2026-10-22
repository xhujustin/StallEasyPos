#!/usr/bin/env bash
set -Eeuo pipefail

case "${1:-}" in
  zhuyin)
    METHOD=chewing
    ;;
  english)
    METHOD=keyboard-us
    ;;
  *)
    printf '用法：%s zhuyin|english\n' "$0" >&2
    exit 2
    ;;
esac

command -v fcitx5-remote >/dev/null 2>&1 || {
  printf '找不到 fcitx5-remote，請先執行 ./scripts/install-touch-input.sh\n' >&2
  exit 1
}

fcitx5-remote -s "$METHOD"
fcitx5-remote -o
CURRENT="$(fcitx5-remote -n)"
printf '目前輸入法：%s\n' "$CURRENT"
[[ "$CURRENT" == "$METHOD" ]]
