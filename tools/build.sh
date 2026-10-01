#!/bin/sh
# 配信用の軽量版(コメント・空白を除いたもの)を作る(2026-10-02)。
# 編集するのは js/script.js と css/style.css(元のファイル)。ゲームが読み込むのは下の2つの軽量版なので、
# 元のファイルを変えたら必ずこれを実行して軽量版も作り直すこと(作り直さないと変更がゲームに反映されない)。
#   js/script.js   → js/script.min.js
#   css/style.css  → css/style.min.css
# esbuild が必要(環境変数 ESBUILD でパスを指定できる)。
set -e
cd "$(dirname "$0")/.."
ESBUILD="${ESBUILD:-esbuild}"
"$ESBUILD" js/script.js --minify --charset=utf8 --legal-comments=none --log-level=warning --outfile=js/script.min.js
"$ESBUILD" css/style.css --minify --charset=utf8 --log-level=warning --outfile=css/style.min.css
echo "built: js/script.min.js css/style.min.css"
