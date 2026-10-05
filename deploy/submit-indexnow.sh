#!/bin/bash
# IndexNow 实时推送：把 sitemap 里的 URL 分批递交（Bing / Yandex / Seznam / Naver 等参与引擎）
# 前提：站点根目录能访问 https://<域名>/key.txt，内容与 <密钥> 一致
#
# 用法：
#   ./submit-indexnow.sh                     # 用下面 3 个变量的默认值
#   ./submit-indexnow.sh www.example.com /opt/indexnow/key.txt /opt/wodewangpan/public/sitemap.xml
set -e

HOST=${1:-www.your-domain.com}                    # ← 站点域名（与 keyLocation 一致）
KEY_FILE=${2:-/opt/indexnow/key.txt}              # ← 密钥文件
SITEMAP=${3:-/opt/wodewangpan/public/sitemap.xml} # ← 构建产物里的 sitemap
LOG=${LOG:-/var/log/submit-indexnow.log}

KEY=$(cat "$KEY_FILE")
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

grep -oE '<loc>[^<]+</loc>' "$SITEMAP" | sed 's/<[^>]*>//g' > "$TMP/urls.txt"
TOTAL=$(wc -l < "$TMP/urls.txt" | tr -d ' ')
split -l 50 "$TMP/urls.txt" "$TMP/part-"

OK=0; FAIL=0
for f in "$TMP"/part-*; do
  N=$(wc -l < "$f" | tr -d ' ')
  node -e '
const fs = require("fs");
const urls = fs.readFileSync(process.argv[1], "utf8").trim().split("\n");
console.log(JSON.stringify({
  host: process.argv[2],
  key: process.argv[3],
  keyLocation: `https://${process.argv[2]}/key.txt`,
  urlList: urls,
}));
' "$f" "$HOST" "$KEY" > "$f.json"

  CODE=$(curl -s -o "$TMP/resp" -w '%{http_code}' -X POST https://api.indexnow.org/indexnow \
    -H 'Content-Type: application/json; charset=utf-8' --data-binary @"$f.json")
  if [ "$CODE" = "200" ] || [ "$CODE" = "202" ]; then
    OK=$((OK + N))
  else
    FAIL=$((FAIL + N)); echo "批次失败 HTTP $CODE：$(cat "$TMP/resp" | head -c 200)"
  fi
  sleep 2
done

echo "$(date '+%F %T') 共 $TOTAL 条：成功 $OK，失败 $FAIL" >> "$LOG"
