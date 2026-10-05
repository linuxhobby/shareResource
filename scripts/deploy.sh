#!/usr/bin/env bash
# 构建并同步到 VPS（rsync）
# 用法：
#   REMOTE_USER=root REMOTE_HOST=1.2.3.4 REMOTE_DIR=/var/www/wodewangpan npm run deploy
# 建议先配好 ssh 免密登录
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_HOST="${REMOTE_HOST:-your-server-ip}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/wodewangpan}"

cd "$ROOT_DIR"

echo "==> 构建"
npm run build

echo "==> 同步到 ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}"
rsync -avz --delete \
  --exclude '.DS_Store' \
  public/ "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"

echo "==> 完成"
