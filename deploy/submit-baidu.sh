#!/bin/bash
# 百度「普通收录」API 推送：把 sitemap 里的 URL 按当天剩余配额分批提交。
# 配额每天重置且与站点抓取量挂钩，推不完的次日自动继续（已完成的不重复推）。
#
# 用法：
#   1) 在百度站长平台验证站点，拿到推送接口里的 token
#   2) 保存 token：echo '你的token' > /opt/seo/baidu_token && chmod 600 /opt/seo/baidu_token
#   3) 手动跑一次：/usr/local/bin/submit-baidu
#   4) 每天自动：0 3 * * * /usr/local/bin/submit-baidu

SITE=${BAIDU_SITE:-https://www.wodewangpan.top}
TOKEN_FILE=${BAIDU_TOKEN_FILE:-/opt/seo/baidu_token}
SITEMAP=${BAIDU_SITEMAP:-/opt/wodewangpan/public/sitemap.xml}
LOG=${BAIDU_LOG:-/var/log/submit-baidu.log}
DONE_LIST=/var/lib/baidu-submitted.txt
TMP=/tmp/baidu-submit

if [ ! -s "$TOKEN_FILE" ]; then
  echo "$(date '+%F %T')  未找到 $TOKEN_FILE，跳过" >> "$LOG"
  exit 1
fi
TOKEN=$(cat "$TOKEN_FILE")
API="http://data.zz.baidu.com/urls?site=${SITE}&token=${TOKEN}"

mkdir -p "$(dirname "$DONE_LIST")" "$TMP"
touch "$DONE_LIST"

# 取全部 sitemap URL，排除已推送过的
grep -oE '<loc>[^<]+</loc>' "$SITEMAP" | sed 's/<[^>]*>//g' \
  | grep -vxF -f "$DONE_LIST" > "$TMP/pending"
TOTAL=$(wc -l < "$TMP/pending" | tr -d ' ')
if [ "$TOTAL" = "0" ]; then
  echo "$(date '+%F %T')  无待推送 URL（已全部推送过）" >> "$LOG"
  rm -rf "$TMP"
  exit 0
fi

post() {  # $1=URL清单文件；结果写入 $TMP/resp，返回 curl 退出码
  curl -s -m 30 -o "$TMP/resp" -X POST "$API" \
    -H 'Content-Type: text/plain' --data-binary @"$1"
}

pick() { grep -oE "\"$1\":-?[0-9]+" "$TMP/resp" | head -1 | grep -oE '\-?[0-9]+'; }

# 探针：用 1 条请求换取当天剩余配额（这 1 条本身也算推送）
head -1 "$TMP/pending" > "$TMP/batch"
post "$TMP/batch"
REMAIN=$(pick remain)
OK=$(pick success)
ERR=$(pick error)
[ -z "$REMAIN" ] && REMAIN=0
[ -z "$OK" ] && OK=0
if [ -n "$ERR" ] && [ "$ERR" != "0" ]; then
  # over quota 属正常情况：配额每天重置，明日自动继续，不算故障
  if grep -q "over quota" "$TMP/resp"; then
    echo "$(date '+%F %T')  当天配额已用尽，明日继续（仍有 $TOTAL 条待推）" >> "$LOG"
    rm -rf "$TMP"
    exit 0
  fi
  echo "$(date '+%F %T')  失败：$(cat "$TMP/resp")" >> "$LOG"
  rm -rf "$TMP"
  exit 1
fi
head -1 "$TMP/pending" >> "$DONE_LIST"
sed -i '1d' "$TMP/pending"

# 按剩余配额继续推，每批最多 100 条
while [ "$REMAIN" -gt 0 ]; do
  LEFT=$(wc -l < "$TMP/pending" | tr -d ' ')
  [ "$LEFT" = "0" ] && break
  N=$((REMAIN < 100 ? REMAIN : 100))
  N=$((LEFT < N ? LEFT : N))
  head -n "$N" "$TMP/pending" > "$TMP/batch"
  post "$TMP/batch"
  S=$(pick success)
  E=$(pick error)
  if [ -n "$E" ] && [ "$E" != "0" ]; then
    grep -q "over quota" "$TMP/resp" || echo "$(date '+%F %T')  批次失败：$(cat "$TMP/resp")" >> "$LOG"
    break
  fi
  head -n "$N" "$TMP/pending" >> "$DONE_LIST"
  sed -i "1,${N}d" "$TMP/pending"
  OK=$((OK + S))
  NEW_REMAIN=$(pick remain)
  [ -z "$NEW_REMAIN" ] && NEW_REMAIN=0
  # 配额没有变化（接口未扣减）时停止，避免空转
  [ "$NEW_REMAIN" -ge "$REMAIN" ] && REMAIN=0 || REMAIN=$NEW_REMAIN
  sleep 1
done

LEFT=$(wc -l < "$TMP/pending" | tr -d ' ')
echo "$(date '+%F %T')  本次推送 $OK 条，待推送还剩 $LEFT 条（配额耗尽则次日继续）" >> "$LOG"
rm -rf "$TMP"
