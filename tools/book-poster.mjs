#!/usr/bin/env node
// 给电子书（book- / bk-）生成 2:3 竖版书封海报：渐变底 + 书本图形 + 书名（自动分行）+ 作者 · 年份。
// 用于没有现成封面图的电子书资源，风格与站内海报一致。
//
// 用法：
//   node tools/book-poster.mjs --title "牧羊少年奇幻之旅" --author "[巴西] 保罗·柯艾略" \
//     --year 1988 --out static/images/bk-002.jpg --c1 "#2f6f5e" --c2 "#8fd3b6"
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
const FONT = 'PingFang SC,Helvetica Neue,Arial,sans-serif';

const title = arg('title', '');
const author = arg('author', '');
const year = arg('year', '');
const out = arg('out');
const c1 = arg('c1', '#2f6f5e');
const c2 = arg('c2', '#8fd3b6');
if (!title || !out) {
  console.error('用法：node tools/book-poster.mjs --title <书名> --out <输出.jpg> [--author ..] [--year ..] [--c1 ..] [--c2 ..]');
  process.exit(1);
}

// 书名分行：≤7 字单行；更长则尽量从中间断开，每行不超过 7 字
function splitTitle(s) {
  const t = String(s).trim();
  if ([...t].length <= 7) return [t];
  const chars = [...t];
  const half = Math.ceil(chars.length / 2);
  let cut = -1;
  for (let i = half; i >= 2 && i <= chars.length - 2; i--) {
    if (/[·:：—\-—\s，,、]/.test(chars[i]) || /[·:：—\-—\s，,、]/.test(chars[i - 1] || '')) {
      cut = i;
      break;
    }
  }
  if (cut < 0) cut = half;
  return [chars.slice(0, cut).join(''), chars.slice(cut).join('')];
}

const lines = splitTitle(title);
const maxLen = Math.max(...lines.map((l) => [...l].length));
const titleSize = maxLen >= 7 ? 46 : maxLen >= 5 ? 54 : 60;
const baseY = 596 - (lines.length - 1) * (titleSize + 8);

const book = `
  <g>
    <rect x="146" y="132" width="188" height="252" rx="10" fill="#fff" fill-opacity=".94"/>
    <rect x="146" y="132" width="20" height="252" rx="10" fill="#000" fill-opacity=".10"/>
    <rect x="146" y="132" width="188" height="252" rx="10" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>
    <rect x="184" y="170" width="118" height="10" rx="5" fill="${c1}" fill-opacity=".55"/>
    <rect x="184" y="198" width="118" height="6" rx="3" fill="${c1}" fill-opacity=".3"/>
    <rect x="184" y="216" width="80" height="6" rx="3" fill="${c1}" fill-opacity=".3"/>
    <rect x="184" y="240" width="118" height="6" rx="3" fill="${c1}" fill-opacity=".22"/>
    <rect x="184" y="258" width="96" height="6" rx="3" fill="${c1}" fill-opacity=".22"/>
    <rect x="184" y="276" width="118" height="6" rx="3" fill="${c1}" fill-opacity=".22"/>
    <rect x="184" y="294" width="64" height="6" rx="3" fill="${c1}" fill-opacity=".22"/>
    <circle cx="288" cy="336" r="16" fill="${c1}" fill-opacity=".35"/>
  </g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="34%" r="72%">
      <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <circle cx="${W / 2}" cy="258" r="188" fill="#fff" fill-opacity=".08"/>
  ${book}
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${lines
    .map(
      (l, i) =>
        `<text x="${W / 2}" y="${baseY + i * (titleSize + 8)}" text-anchor="middle" font-size="${titleSize}" font-weight="700" font-family="${FONT}" fill="#fff">${esc(l)}</text>`
    )
    .join('\n  ')}
  ${
    author || year
      ? `<text x="${W / 2}" y="${baseY + lines.length * (titleSize + 8) + 26}" text-anchor="middle" font-size="24" font-family="${FONT}" fill="#fff" fill-opacity=".88">${esc([author, year].filter(Boolean).join(' · '))}</text>`
      : ''
  }
</svg>`;

fs.mkdirSync(path.dirname(out), { recursive: true });
await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(out);
console.log(`书封已生成：${out}（${W}×${H}）`);
