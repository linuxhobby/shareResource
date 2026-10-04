#!/bin/bash
# 站点自动更新：git 有新提交才重建 + reload nginx
# 用法：改下面 3 个变量 → install -m755 到 /usr/local/bin/site-autoupdate → 加进 root 的 crontab
set -e

# cron 的 PATH 很窄，nginx / systemctl 常不在里面，这里补齐（否则构建完不会 reload）
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

SITE_DIR=/opt/ShareResource          # ← 站点目录
BASE_URL=https://your-domain.com     # ← 站点域名（影响 canonical / OG / sitemap）
LOG=/var/log/site-autoupdate.log

cd "$SITE_DIR"
git fetch --depth 1 origin main -q
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  exit 0                              # 没更新，直接退出
fi

echo "$(date '+%F %T') 发现更新：${LOCAL:0:7} → ${REMOTE:0:7}" >> "$LOG"
git reset --hard origin/main -q
npm ci --no-audit --no-fund >> "$LOG" 2>&1
BASE_URL=$BASE_URL npm run build >> "$LOG" 2>&1
nginx -t && systemctl reload nginx
echo "$(date '+%F %T') 更新完成：${REMOTE:0:7}" >> "$LOG"
