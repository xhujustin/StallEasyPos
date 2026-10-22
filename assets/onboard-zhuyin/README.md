# Onboard 注音鍵帽版面

版面來源：[andyching168/onboard-layout-zhuyin](https://github.com/andyching168/onboard-layout-zhuyin)，固定參考提交 `3aad517673bd8edb15dd7b725a668e20181ea6da`。原作者及上游版權宣告保留在 `zhuyin.onboard` 與 SVG 檔中。

授權為 GPL-3.0，完整授權文字見 [LICENSE](LICENSE)。本專案的調整是將注音符號顯示為預設鍵帽，英數標籤改為 AltGr 鍵帽；實際送出的仍是原版的 X11 按鍵碼，由已配置的 Fcitx5 Chewing 進行注音組字。

鍵盤底列的「英」會將 Fcitx5 切到英文鍵盤，並顯示英文鍵帽；「注」會將 Fcitx5 切回 Chewing，並顯示注音鍵帽。切換在背景執行，完成後才更新鍵帽；若輸入法切換失敗，版面保持原狀，錯誤寫入 `/tmp/stalleasy-onboard.log`。實體鍵盤的 Ctrl+Space 仍可切換輸入法，但不會同步改變 Onboard 鍵帽。
