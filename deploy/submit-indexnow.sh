#!/bin/bash
# IndexNow 实时推送：把 sitemap 里的 URL 分批递交（Bing / Yandex / Seznam / Naver 等参与引擎）
# 前提：站点根目录能访问 https://<域名>/key.txt，内容与 <密钥> 一致
#
# 默认只推「有变化的 URL」：取 sitemap 里 lastmod >= 昨天的条目。
# IndexNow 官方建议仅在内容新增 / 变更时提交，天天全量推 595 条既没收益也浪费配额。
#
# 用法：
#   ./submit-indexnow.sh                     # 增量：只推 lastmod >= 昨天的 URL
#   ALL=1 ./submit-indexnow.sh               # 全量：首次上线 / 换域名 / 补推时用
#   SINCE=2026-10-01 ./submit-indexnow.sh    # 自定义起点（推 lastmod >= 该日期的 URL）
#   ./submit-indexnow.sh www.example.com /opt/indexnow/key.txt /opt/wodewangpan/public/sitemap.xml
set -e

HOST=${1:-www.your-domain.com}                    # ← 站点域名（与 keyLocation 一致）
KEY_FILE=${2:-/opt/indexnow/key.txt}              # ← 密钥文件
SITEMAP=${3:-/opt/wodewangpan/public/sitemap.xml} # ← 构建产物里的 sitemap
LOG=${LOG:-/var/log/submit-indexnow.log}

# ALL=1 全量；否则以昨天（SINCE 可覆盖）为起点，只推新增 / 变更过的 URL
ALL=${ALL:-0}
SINCE=${SINCE:-$(date -d 'yesterday' +%F)}

KEY=$(cat "$KEY_FILE")
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

if [ "$ALL" = "1" ]; then
  grep -oE '<loc>[^<]+</loc>' "$SITEMAP" | sed 's/<[^>]*>//g' > "$TMP/urls.txt"
else
  # 每个 <url>…</url> 独占一行，取同行里的 <loc> 与 <lastmod> 配对，
  # 日期是 YYYY-MM-DD，字符串比较即等价于日期比较
  awk -v since="$SINCE" '
    match($0, /<loc>[^<]+<\/loc>/)       { loc = substr($0, RSTART + 5,  RLENGTH - 11) }
    match($0, /<lastmod>[^<]+<\/lastmod>/) {
      lm = substr($0, RSTART + 9, RLENGTH - 19)
      if (lm >= since) print loc
    }
  ' "$SITEMAP" > "$TMP/urls.txt"
fi

TOTAL=$(wc -l < "$TMP/urls.txt" | tr -d ' ')
if [ "$TOTAL" = "0" ]; then
  echo "$(date '+%F %T') 无新增或变更的 URL（since $SINCE），本次未推送" >> "$LOG"
  exit 0
fi

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

echo "$(date '+%F %T') ${ALL:+[全量] }since $SINCE 共 $TOTAL 条：成功 $OK，失败 $FAIL" >> "$LOG"
