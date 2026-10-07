#!/usr/bin/env node
// 给「套装 / 合辑」类电子书生成 2:3 竖版封面（深色收藏版式）：暗底 + 红色氛围光 + 扫描线 + 双线内框，
// 版式为「顶部拉丁字母 → 小字前缀行 → 主标题 → 册数徽标 → 底部信息」。
// 适用于豆瓣查不到正版封面、或本身就是多册合辑（没有单册封面对应）的条目。
// 单册书仍优先用 tools/book-cover-douban.mjs 抓豆瓣正版封面。
//
// 用法：
//   node tools/set-poster.mjs --kicker "STEPHEN KING" --prefix "斯蒂芬·金的" --title "王牌惊悚套装" \
//     --badge "共 17 册" --label "COLLECTED WORKS" --formats "epub · mobi · azw3" \
//     --author "[美] 斯蒂芬·金" --out static/images/bk-006.jpg
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : d;
};
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const W = 480;
const H = 720;
const FONT = 'Microsoft YaHei,PingFang SC,Helvetica Neue,Arial,sans-serif';

const kicker = arg('kicker', '');
const prefix = arg('prefix', '');
const title = arg('title', '');
const badge = arg('badge', '');
const label = arg('label', '');
const formats = arg('formats', '');
const author = arg('author', '');
const accent = arg('accent', '#c02222');
const out = arg('out');

if (!title || !out) {
  console.error('用法：node tools/set-poster.mjs --title <主标题> --out <输出.jpg> \\');
  console.error('       [--kicker <顶部拉丁字母>] [--prefix <小字前缀行>] [--badge <徽标，如 共 17 册>] \\');
  console.error('       [--label <徽标下方拉丁字母>] [--formats <格式串>] [--author <作者>] [--accent <主色>]');
  process.exit(1);
}

// 深色 + 主色氛围，主色由 accent 派生明暗三档
const hex = accent.replace('#', '');
const [ar, ag, ab] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (v, k) => Math.max(0, Math.min(255, Math.round(v * k)));
const shade = (k) => `#${[ar, ag, ab].map((v) => mix(v, k).toString(16).padStart(2, '0')).join('')}`;
const dark = shade(0.72); // 深档，用于描边
const deep = shade(0.55); // 更暗，用于渐变尾

// 主标题字号随字数收缩，保证不超过内框安全宽度
const titleLen = [...title].length;
const titleSize = titleLen <= 5 ? 58 : titleLen <= 6 ? 55 : titleLen <= 8 ? 48 : 42;

const badgeW = badge ? Math.max(148, [...badge].length * 15 + 56) : 0;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a0b0f"/>
      <stop offset="0.42" stop-color="#161821"/>
      <stop offset="1" stop-color="#08090c"/>
    </linearGradient>

    <radialGradient id="halo" cx="50%" cy="46%" r="46%">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.34"/>
      <stop offset="0.45" stop-color="${deep}" stop-opacity="0.15"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="vig" cx="50%" cy="46%" r="76%">
      <stop offset="0.55" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.62"/>
    </radialGradient>

    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${dark}" stop-opacity="0"/>
      <stop offset="0.5" stop-color="${accent}" stop-opacity="0.95"/>
      <stop offset="1" stop-color="${dark}" stop-opacity="0"/>
    </linearGradient>

    <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="2" fill="#ffffff" fill-opacity="0.02"/>
    </pattern>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#halo)"/>
  <rect width="${W}" height="${H}" fill="url(#scan)"/>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>

  <!-- 双线内框 -->
  <rect x="17" y="17" width="${W - 34}" height="${H - 34}" fill="none" stroke="${dark}" stroke-opacity="0.5" stroke-width="1.3"/>
  <rect x="23" y="23" width="${W - 46}" height="${H - 46}" fill="none" stroke="${dark}" stroke-opacity="0.16" stroke-width="0.8"/>

  ${
    kicker
      ? `<!-- 顶部拉丁字母 -->
  <text x="${W / 2}" y="102" text-anchor="middle" font-family="${FONT}" font-size="21" letter-spacing="7" fill="${shade(1.08)}">${esc(kicker)}</text>
  <rect x="${W / 2 - 34}" y="120" width="68" height="1.5" fill="url(#rule)"/>`
      : ''
  }

  ${
    prefix
      ? `<!-- 前缀行 -->
  <text x="${W / 2}" y="300" text-anchor="middle" font-family="${FONT}" font-size="40" fill="#c2c5cf">${esc(prefix)}</text>`
      : ''
  }

  <!-- 主标题 -->
  <text x="${W / 2}" y="374" text-anchor="middle" font-family="${FONT}" font-size="${titleSize}" font-weight="700" fill="#ffffff">${esc(title)}</text>

  ${
    badge
      ? `<!-- 徽标 -->
  <rect x="${(W - badgeW) / 2}" y="428" width="${badgeW}" height="46" rx="23" fill="${accent}" fill-opacity="0.15" stroke="${shade(1.12)}" stroke-opacity="0.9" stroke-width="1.4"/>
  <text x="${W / 2}" y="458" text-anchor="middle" font-family="${FONT}" font-size="22" fill="${shade(1.3)}">${esc(badge)}</text>`
      : ''
  }

  ${
    label
      ? `<text x="${W / 2}" y="518" text-anchor="middle" font-family="${FONT}" font-size="13" letter-spacing="4" fill="#848894">${esc(label)}</text>`
      : ''
  }

  <rect x="${W / 2 - 62}" y="558" width="124" height="1.4" fill="url(#rule)"/>
  ${
    formats
      ? `<text x="${W / 2}" y="614" text-anchor="middle" font-family="${FONT}" font-size="16" fill="#767a85">${esc(formats)}</text>`
      : ''
  }
  ${
    author
      ? `<text x="${W / 2}" y="648" text-anchor="middle" font-family="${FONT}" font-size="17" fill="#a3a8b2">${esc(author)}</text>`
      : ''
  }
</svg>`;

fs.mkdirSync(path.dirname(out), { recursive: true });
await sharp(Buffer.from(svg)).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toFile(out);
const m = await sharp(out).metadata();
console.log(`套装封面已生成：${out}（${m.width}×${m.height}）`);
