import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'svg'];
const DETAIL = { w: 180, h: 260 };
const CARD = { w: 240, h: 360 };
const THUMB = { w: 60, h: 90 };
const SIZES = [DETAIL, CARD, THUMB];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function loadSharp() {
  try {
    const mod = await import('sharp');
    return mod.default || mod;
  } catch {
    return null;
  }
}

/** ICO 容器：直接内嵌 PNG 数据（浏览器普遍支持），省掉一个图标库依赖 */
function pngToIco(pngBuf, size) {
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0);
  dir.writeUInt16LE(1, 2);
  dir.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry[0] = size;
  entry[1] = size;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuf.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([dir, entry, pngBuf]);
}

/** 站点图标：static/favicon.svg → favicon.svg（矢量）＋ favicon.ico（32px）＋ apple-touch-icon.png（180px） */
export async function writeFavicon(staticDir, outDir) {
  const src = path.join(staticDir, 'favicon.svg');
  if (!fs.existsSync(src)) return false;
  const svg = fs.readFileSync(src);
  fs.writeFileSync(path.join(outDir, 'favicon.svg'), svg);
  const sharp = await loadSharp();
  if (sharp) {
    try {
      const png32 = await sharp(svg, { density: 384 }).resize(32, 32).png().toBuffer();
      fs.writeFileSync(path.join(outDir, 'favicon.ico'), pngToIco(png32, 32));
      const png180 = await sharp(svg, { density: 384 }).resize(180, 180).png().toBuffer();
      fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), png180);
    } catch {
      console.log('  ! 图标位图生成失败，仅输出 favicon.svg');
    }
  }
  return true;
}

const FONT = 'PingFang SC,Microsoft YaHei,Hiragino Sans GB,sans-serif';
const PW = CARD.w;
const PH = CARD.h;
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 各分类占位海报的配色与图标；未收录的分类按名称派生色相，图标回退文件夹 */
const CAT_STYLE = {
  电影: { c1: '#4b3fe3', c2: '#8b7cf8', icon: 'film' },
  电视剧: { c1: '#0e7490', c2: '#22d3ee', icon: 'tv' },
  纪录片: { c1: '#047857', c2: '#34d399', icon: 'globe' },
  动漫: { c1: '#be185d', c2: '#fb923c', icon: 'bubble' },
  游戏: { c1: '#6d28d9', c2: '#ec4899', icon: 'pad' },
  软件: { c1: '#334155', c2: '#64748b', icon: 'window' },
  其他: { c1: '#7c6f64', c2: '#a8a29e', icon: 'folder' },
};

/** 96×96 线稿图标，stroke 由外层 <g> 统一指定 */
const ICONS = {
  film: '<rect x="12" y="30" width="72" height="48" rx="6"/><path d="M12 30 28 20l12 10 16-10 16 10 12-8"/>',
  tv: '<rect x="12" y="26" width="72" height="48" rx="6"/><path d="M34 74h28M48 74v12M32 86h32"/><path d="M30 26 44 12M66 26 52 12"/>',
  globe: '<circle cx="48" cy="48" r="34"/><path d="M14 48h68"/><path d="M48 14c14 12 20 24 20 34s-6 22-20 34c-14-12-20-24-20-34s6-22 20-34z"/><path d="M18 30h60M18 66h60"/>',
  bubble:
    '<path d="M16 22h64a10 10 0 0 1 10 10v30a10 10 0 0 1-10 10H46l-16 14V72h-14a10 10 0 0 1-10-10V32a10 10 0 0 1 10-10z"/><circle cx="38" cy="45" r="4" fill="#fff" stroke="none"/><circle cx="50" cy="45" r="4" fill="#fff" stroke="none"/><circle cx="62" cy="45" r="4" fill="#fff" stroke="none"/>',
  pad:
    '<rect x="10" y="30" width="76" height="42" rx="16"/><path d="M30 42v14M23 49h14"/><circle cx="64" cy="45" r="5" fill="#fff" stroke="none"/><circle cx="76" cy="55" r="5" fill="#fff" stroke="none"/>',
  window:
    '<rect x="14" y="20" width="68" height="56" rx="6"/><path d="M14 38h68"/><circle cx="24" cy="29" r="3" fill="#fff" stroke="none"/><circle cx="36" cy="29" r="3" fill="#fff" stroke="none"/><path d="M24 50h32M24 62h20"/>',
  folder: '<path d="M10 28a6 6 0 0 1 6-6h20l8 10h40a6 6 0 0 1 6 6v32a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6z"/>',
};

/** 某分类的占位海报 SVG：渐变底 + 分类图标 + 分类名 */
function categorySvg(name) {
  const s =
    CAT_STYLE[name] ||
    (() => {
      let h = 7;
      for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) % 360;
      return { c1: `hsl(${h} 42% 40%)`, c2: `hsl(${(h + 30) % 360} 52% 62%)`, icon: 'folder' };
    })();
  const icon = ICONS[s.icon] || ICONS.folder;
  const label = esc(name);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}" role="img" aria-label="${label} 暂无配图">
  <defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${s.c1}"/><stop offset="1" stop-color="${s.c2}"/></linearGradient></defs>
  <rect width="${PW}" height="${PH}" fill="url(#pg)"/>
  <g transform="translate(${(PW - 96) / 2},112)" fill="none" stroke="#fff" stroke-opacity=".92" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${icon}</g>
  <text x="${PW / 2}" y="262" text-anchor="middle" font-size="27" font-family="${FONT}" fill="#fff" fill-opacity=".96">${label}</text>
  <text x="${PW / 2}" y="294" text-anchor="middle" font-size="14" font-family="${FONT}" fill="#fff" fill-opacity=".68">暂无配图</text>
</svg>
`;
}

/** 通用占位图：分类未知时兜底（分类图标 + 暂无配图） */
export function writePlaceholder(outDir) {
  const dir = path.join(outDir, 'img');
  ensureDir(dir);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}" role="img" aria-label="暂无配图">
  <rect width="${PW}" height="${PH}" fill="#EFEFF2"/>
  <g transform="translate(${(PW - 96) / 2},112)" fill="none" stroke="#B4B4BC" stroke-width="5" stroke-linejoin="round">
    <rect x="16" y="28" width="64" height="48" rx="6"/>
    <path d="M18 68l18-20 13 15 10-10 27 24"/>
    <circle cx="34" cy="44" r="5"/>
  </g>
  <text x="${PW / 2}" y="262" text-anchor="middle" font-size="22" font-family="${FONT}" fill="#8A8A94">暂无配图</text>
</svg>
`;
  fs.writeFileSync(path.join(dir, 'placeholder.svg'), svg);
  return '/img/placeholder.svg';
}

/** 按分类生成占位海报，返回 分类名 -> URL */
export function writeCategoryPlaceholders(outDir, categories = []) {
  const dir = path.join(outDir, 'img');
  ensureDir(dir);
  const map = new Map();
  for (const c of categories) {
    if (!c || map.has(c)) continue;
    const file = `placeholder-${c}.svg`;
    fs.writeFileSync(path.join(dir, file), categorySvg(c));
    map.set(c, `/img/${encodeURIComponent(file)}`);
  }
  return map;
}

function resolveSource(item, staticDir, rootDir) {
  const candidates = [];
  if (item.image) {
    candidates.push(
      path.join(staticDir, 'images', item.image),
      path.join(rootDir, item.image),
      path.join(staticDir, item.image)
    );
  } else {
    for (const ext of IMAGE_EXT) candidates.push(path.join(staticDir, 'images', `${item.id}.${ext}`));
  }
  return candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile()) || null;
}

const VARIANTS = [
  { key: 'detailExt', size: DETAIL, quality: 82 },
  { key: 'cardExt', size: CARD, quality: 80 },
  { key: 'thumbExt', size: THUMB, quality: 78 },
];

async function renderVariants(sharp, src, destBase) {
  const ext = path.extname(src).toLowerCase();
  if (!sharp) {
    // 没有 sharp：原图直接复用，靠 CSS 裁切
    for (const v of VARIANTS) fs.copyFileSync(src, `${destBase}-${v.size.w}.${ext.slice(1)}`);
    return { detailExt: ext.slice(1), cardExt: ext.slice(1), thumbExt: ext.slice(1) };
  }
  try {
    for (const v of VARIANTS) {
      await sharp(src)
        .resize(v.size.w, v.size.h, { fit: 'cover' })
        .webp({ quality: v.quality })
        .toFile(`${destBase}-${v.size.w}.webp`);
    }
    return { detailExt: 'webp', cardExt: 'webp', thumbExt: 'webp' };
  } catch {
    for (const v of VARIANTS) fs.copyFileSync(src, `${destBase}-${v.size.w}${ext}`);
    return { detailExt: ext.slice(1), cardExt: ext.slice(1), thumbExt: ext.slice(1) };
  }
}

/**
 * 处理全部配图：生成详情页 180×260 与列表页 60×90 两份 WebP
 * 返回 id -> { detail, thumb }
 */
export async function prepareImages(items, { staticDir, rootDir, outDir }) {
  const sharp = await loadSharp();
  if (!sharp) {
    console.log('  ! 未安装 sharp，配图将按原图输出（npm i sharp 可自动生成压缩 WebP）');
  }
  const placeholder = writePlaceholder(outDir);
  const catPlaceholders = writeCategoryPlaceholders(outDir, [
    ...new Set(items.map((i) => i.category)),
  ]);
  const imgDir = path.join(outDir, 'img');
  ensureDir(imgDir);

  const map = new Map();
  let processed = 0;
  let missing = 0;

  for (const item of items) {
    const src = resolveSource(item, staticDir, rootDir);
    if (!src) {
      // 缺图时用该资源所属分类的占位海报，一眼能看出是哪一类
      const ph = catPlaceholders.get(item.category) || placeholder;
      map.set(item.id, { detail: ph, card: ph, thumb: ph });
      missing++;
      continue;
    }
    const destBase = path.join(imgDir, item.id);
    const { detailExt, cardExt, thumbExt } = await renderVariants(sharp, src, destBase);
    map.set(item.id, {
      detail: `/img/${encodeURIComponent(item.id)}-${DETAIL.w}.${detailExt}`,
      card: `/img/${encodeURIComponent(item.id)}-${CARD.w}.${cardExt}`,
      thumb: `/img/${encodeURIComponent(item.id)}-${THUMB.w}.${thumbExt}`,
    });
    processed++;
  }

  return { map, processed, missing };
}

/** 构建时预生成二维码 SVG（纯静态图片，无需 JS） */
export async function writeQr(item, outDir) {
  const dir = path.join(outDir, 'qr');
  ensureDir(dir);
  const results = [];
  for (const link of item.links.slice(0, 3)) {
    const file = `${item.id}-${link.kind}.svg`;
    let svg = await QRCode.toString(link.url, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#171717', light: '#FFFFFF' },
    });
    svg = svg.replace('<svg ', '<svg width="120" height="120" ');
    fs.writeFileSync(path.join(dir, file), svg);
    results.push({ ...link, qr: `/qr/${encodeURIComponent(file)}` });
  }
  return results;
}

/** 拷贝主题静态资源（CSS / JS） */
export function copyThemeAssets(themeDir, outDir) {
  const src = path.join(themeDir, 'assets');
  const dest = path.join(outDir, 'assets');
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const f of fs.readdirSync(src)) {
    fs.copyFileSync(path.join(src, f), path.join(dest, f));
  }
}
