#!/usr/bin/env python3
"""本地访问统计：增量解析 nginx access.log，累计 PV/UV 写入 SQLite，输出 stats.json。

用法：
  sitestats.py              增量处理自上次位置以来的新日志（cron 每 5 分钟执行）
  sitestats.py --backfill   从当前 access.log 开头全量解析（回填历史，处理完把游标推到末尾）
  sitestats.py --file X     指定日志文件（配合 --backfill 用，不移动主游标）
  sitestats.py --reset      清空统计与游标后全量回填
"""

import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys
from datetime import datetime, timedelta, timezone

LOG = '/var/log/nginx/access.log'
DB = '/var/lib/sitestats/stats.db'
OUT = '/var/lib/sitestats/stats.json'
TZ = timezone(timedelta(hours=8))

# combined 格式 + 末尾可选的 "$cookie_vid"
LINE_RE = re.compile(
    r'^(\S+) \S+ \S+ \[([^\]]+)\] "([A-Z]+) (\S+) [^"]*" (\d{3}) \S+ "[^"]*" "([^"]*)"(?: "([^"]*)")?'
)
BOT_RE = re.compile(
    r'(bot|spider|crawl|slurp|baidu|bing|yandex|sogou|semrush|ahrefs|mj12|dotbot|petalbot|'
    r'bytespider|applebot|facebookexternalhit|duckduckbot|archive\.org|monitor|curl|wget|'
    r'python-requests|headless|go-http-client|okhttp|scrapy|feed|rss)',
    re.I,
)
SKIP_PATH_RE = re.compile(
    r'\.(css|js|mjs|json|xml|txt|png|jpe?g|gif|ico|svg|webp|woff2?|ttf|map)(\?|$)'
    r'|^/404\.html$|^/stats\.json$|^/robots\.txt$|^/sitemap\.xml$|^/key\.txt$',
    re.I,
)
VID_RE = re.compile(r'^[A-Za-z0-9_-]{8,64}$')


def log(msg):
    print(f'[{datetime.now(TZ).strftime("%F %T")}] {msg}', flush=True)


def connect():
    os.makedirs(os.path.dirname(DB), exist_ok=True)
    c = sqlite3.connect(DB)
    c.executescript(
        '''CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);
           CREATE TABLE IF NOT EXISTS visitors(fp TEXT PRIMARY KEY, first_seen TEXT, last_seen TEXT);
           CREATE TABLE IF NOT EXISTS daily(d TEXT PRIMARY KEY, pv INTEGER DEFAULT 0);
           CREATE TABLE IF NOT EXISTS daily_uv(d TEXT, fp TEXT, PRIMARY KEY(d, fp));'''
    )
    return c


def meta_get(c, k, default=None):
    row = c.execute('SELECT value FROM meta WHERE key=?', (k,)).fetchone()
    return row[0] if row else default


def meta_set(c, k, v):
    c.execute('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', (k, v))


def fingerprint(ip, ua, vid):
    """访客指纹：优先用前端 cookie 里的 vid，无 cookie 时回退 IP+UA 哈希。"""
    if vid and VID_RE.match(vid):
        return 'v:' + vid
    return 'i:' + hashlib.sha1(f'{ip}|{ua}'.encode('utf-8', 'replace')).hexdigest()[:16]


def parse_line(line):
    m = LINE_RE.match(line)
    if not m:
        return None
    ip, ts, method, path, status, ua, vid = m.groups()
    if method not in ('GET', 'HEAD'):
        return None
    if not status.isdigit() or int(status) >= 400:
        return None
    path = path.split('?', 1)[0]
    if SKIP_PATH_RE.search(path):
        return None
    if BOT_RE.search(ua):
        return None
    try:
        dt = datetime.strptime(ts, '%d/%b/%Y:%H:%M:%S %z').astimezone(TZ)
    except ValueError:
        return None
    return dt.strftime('%F'), fingerprint(ip, ua, vid), dt.isoformat()


def ingest(c, lines):
    pv = 0
    for line in lines:
        r = parse_line(line)
        if not r:
            continue
        day, fp, ts = r
        c.execute('INSERT INTO daily(d,pv) VALUES(?,0) ON CONFLICT(d) DO NOTHING', (day,))
        c.execute('UPDATE daily SET pv=pv+1 WHERE d=?', (day,))
        c.execute(
            'INSERT INTO visitors(fp,first_seen,last_seen) VALUES(?,?,?) '
            'ON CONFLICT(fp) DO UPDATE SET last_seen=excluded.last_seen',
            (fp, ts, ts),
        )
        c.execute('INSERT OR IGNORE INTO daily_uv(d,fp) VALUES(?,?)', (day, fp))
        pv += 1
    return pv


def write_stats(c):
    pv = c.execute('SELECT COALESCE(SUM(pv),0) FROM daily').fetchone()[0]
    uv = c.execute('SELECT COUNT(*) FROM visitors').fetchone()[0]
    today = datetime.now(TZ).strftime('%F')
    t_pv = c.execute('SELECT COALESCE(pv,0) FROM daily WHERE d=?', (today,)).fetchone()[0]
    t_uv = c.execute('SELECT COUNT(*) FROM daily_uv WHERE d=?', (today,)).fetchone()[0]
    since = c.execute('SELECT MIN(d) FROM daily').fetchone()[0]
    data = {
        'pv': pv,
        'uv': uv,
        'today_pv': t_pv,
        'today_uv': t_uv,
        'since': since or today,
        'updated': datetime.now(TZ).isoformat(timespec='seconds'),
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    tmp = OUT + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(tmp, OUT)
    return data


def read_chunk(path, offset, whole=False):
    """返回 (行列表, 新offset)。非 whole 模式只处理到最后一个换行，避免半行。"""
    with open(path, 'rb') as f:
        if offset:
            f.seek(offset)
        raw = f.read()
    if not raw:
        return [], offset
    if not whole:
        cut = raw.rfind(b'\n')
        if cut == -1:
            return [], offset
        raw = raw[: cut + 1]
    text = raw.decode('utf-8', 'replace')
    return [l for l in text.split('\n') if l.strip()], offset + len(raw)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--backfill', action='store_true', help='从文件开头全量解析')
    ap.add_argument('--file', help='指定日志文件（不移动主游标）')
    ap.add_argument('--reset', action='store_true', help='清空后重新统计')
    a = ap.parse_args()

    c = connect()
    if a.reset:
        c.executescript('DELETE FROM meta; DELETE FROM visitors; DELETE FROM daily; DELETE FROM daily_uv;')
        log('已清空历史统计')

    if a.file:
        lines, _ = read_chunk(a.file, 0, whole=True)
        n = ingest(c, lines)
        c.commit()
        log(f'回填 {a.file}：{len(lines)} 行 → 计入 {n} PV')
        log('统计结果：' + json.dumps(write_stats(c), ensure_ascii=False))
        return 0

    if not os.path.exists(LOG):
        log(f'日志文件不存在：{LOG}')
        return 1

    st = os.stat(LOG)
    inode = str(st.st_ino)
    offset = int(meta_get(c, 'offset', '0') or 0)
    if meta_get(c, 'inode') != inode:
        offset = 0  # logrotate 后的新文件
        meta_set(c, 'inode', inode)
    if st.st_size < offset:
        offset = 0  # 被截断

    lines, new_off = read_chunk(LOG, offset, whole=a.backfill)
    n = ingest(c, lines) if lines else 0
    meta_set(c, 'offset', str(new_off))
    c.commit()
    log(f'新日志 {len(lines)} 行 → 计入 {n} PV（游标 {offset} → {new_off}）')
    log('统计结果：' + json.dumps(write_stats(c), ensure_ascii=False))
    c.close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
