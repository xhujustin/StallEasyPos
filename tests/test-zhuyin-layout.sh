#!/usr/bin/env bash
set -Eeuo pipefail

TEST_ROOT="$(mktemp -d)"
export TEST_ROOT
trap 'rm -rf "$TEST_ROOT"' EXIT
HOME="$TEST_ROOT" scripts/install-zhuyin-layout.sh >/dev/null
LAYOUT_DIR="$TEST_ROOT/.local/share/onboard/layouts"

for name in zhuyin.onboard zhuyin-Alpha.svg zhuyin-Numbers.svg zhuyin-Utils.svg; do
  cmp "assets/onboard-zhuyin/$name" "$LAYOUT_DIR/$name"
done
for name in stalleasy_input.py stalleasy_english.py stalleasy_zhuyin.py; do
  cmp "scripts/$name" "$(HOME="$TEST_ROOT" python3 -m site --user-site)/$name"
done

python3 - <<'PY'
from pathlib import Path
from xml.etree import ElementTree

base = Path("assets/onboard-zhuyin")
for path in base.glob("*.onboard"):
    ElementTree.parse(path)
for path in base.glob("*.svg"):
    ElementTree.parse(path)

root = ElementTree.parse(base / "zhuyin.onboard").getroot()
layers = {panel.get("layer"): {key.get("id"): key for key in panel.iter("key")}
          for panel in root.iter("panel") if panel.get("layer")}
assert layers["alpha"]["AE01"].get("label") == "ㄅ"
assert layers["alpha"]["AD01"].get("label") == "ㄆ"
assert layers["alpha"]["AC01"].get("label") == "ㄇ"
assert layers["english"]["AE01"].get("label") == "1"
assert layers["english"]["AD01"].get("label") == "q"
assert layers["english"]["AC01"].get("label") == "a"
assert layers["alpha"]["AE01"].get("keycode") == layers["english"]["AE01"].get("keycode") == "10"
assert layers["alpha"]["stalleasy-english"].get("script") == "stalleasy_english"
assert layers["english"]["stalleasy-zhuyin"].get("script") == "stalleasy_zhuyin"
assert list(layers) == ["alpha", "numbers", "utils", "english"]
PY

echo "PASS: Onboard 注音與英文鍵帽可切換，XML 有效且按鍵碼一致。"
