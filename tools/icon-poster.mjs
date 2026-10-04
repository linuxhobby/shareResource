#!/usr/bin/env node
// 把方形应用图标合成为 2:3 竖版资源海报，供软件 / 音频等没有 TMDB 海报的资源使用。
// 输出图直接放进 static/images/，写法与普通海报一致（如 image: app-005.jpg）。
//
// 用法：
//   node tools/icon-poster.mjs --icon <本地文件|图片URL> --out static/images/app-005.jpg \
//     [--title "AdGuard"] [--sub "广告拦截 · 隐私保护"] [--c1 "#2f8f5b"] [--c2 "#7ccb95"]
//
// 图标来源建议：Mac App Store / App Store 的 iTunes Search API（官方图标，无需鉴权）：
//   curl -s "https://itunes.apple.com/search?term=AdGuard&entity=macSoftware&country=cn&limit=5"
//   取结果的 artworkUrl512
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
const ICON = 300;
const FONT = 'PingFang SC,Helvetica Neue,Arial,sans-serif';

const icon = arg('icon');
const out = arg('out');
if (!icon || !out) {
  console.error('用法：node tools/icon-poster.mjs --icon <文件|URL> --out <输出.jpg> [--title ..] [--sub ..] [--c1 ..] [--c2 ..]');
  process.exit(1);
}
const title = arg('title', '');
const sub = arg('sub', '');
const c1 = arg('c1', '#2f8f5b');
const c2 = arg('c2', '#7ccb95');
// 图标圆角半径，取图标边长的百分比（0 = 不裁；App Store 的 iOS 图标是直角方形，一般给 22）
const radiusPct = Math.max(0, Math.min(50, Number(arg('radius', '0')) || 0));

const src = /^https?:/.test(icon)
  ? Buffer.from(await (await fetch(icon)).arrayBuffer())
  : fs.readFileSync(icon);

const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="38%" r="70%">
      <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <circle cx="${W / 2}" cy="286" r="196" fill="#fff" fill-opacity=".1"/>
  <circle cx="${W / 2}" cy="286" r="196" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="2"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
</svg>`;

const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${
    title
      ? `<text x="${W / 2}" y="${sub ? 592 : 604}" text-anchor="middle" font-size="50" font-weight="700" font-family="${FONT}" fill="#fff">${esc(title)}</text>`
      : ''
  }
  ${sub ? `<text x="${W / 2}" y="638" text-anchor="middle" font-size="23" font-family="${FONT}" fill="#fff" fill-opacity=".86">${esc(sub)}</text>` : ''}
</svg>`;

let iconBuf = await sharp(src)
  .resize(ICON, ICON, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

if (radiusPct > 0) {
  const r = Math.round((ICON * radiusPct) / 100);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON}" height="${ICON}"><rect width="${ICON}" height="${ICON}" rx="${r}" ry="${r}" fill="#fff"/></svg>`
  );
  iconBuf = await sharp(iconBuf).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

fs.mkdirSync(path.dirname(out), { recursive: true });
await sharp(Buffer.from(bg))
  .composite([
    { input: iconBuf, left: Math.round((W - ICON) / 2), top: 136 },
    { input: Buffer.from(text), left: 0, top: 0 },
  ])
  .jpeg({ quality: 90 })
  .toFile(out);

console.log(`海报已生成：${out}（${W}×${H}）`);
