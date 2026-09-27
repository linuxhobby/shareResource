import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'svg'];
const DETAIL = { w: 180, h: 260 };
const THUMB = { w: 60, h: 90 };

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

/** 占位图：缺图时统一显示（分类图标 + 暂无配图） */
export function writePlaceholder(outDir) {
  const dir = path.join(outDir, 'img');
  ensureDir(dir);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${DETAIL.w}" height="${DETAIL.h}" viewBox="0 0 ${DETAIL.w} ${DETAIL.h}" role="img" aria-label="暂无配图">
  <rect width="${DETAIL.w}" height="${DETAIL.h}" fill="#EFEFF2"/>
  <g fill="none" stroke="#B4B4BC" stroke-width="3" stroke-linejoin="round">
    <rect x="58" y="86" width="64" height="48" rx="6"/>
    <path d="M60 126l16-18 12 14 9-9 25 22"/>
    <circle cx="76" cy="102" r="5"/>
  </g>
  <text x="90" y="158" font-size="14" font-family="PingFang SC,Microsoft YaHei,sans-serif" fill="#8A8A94" text-anchor="middle">暂无配图</text>
</svg>
`;
  fs.writeFileSync(path.join(dir, 'placeholder.svg'), svg);
  return '/img/placeholder.svg';
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

async function renderVariants(sharp, src, destBase) {
  const ext = path.extname(src).toLowerCase();
  if (!sharp) {
    // 没有 sharp：原图直接复用，靠 CSS 裁切
    for (const size of [DETAIL, THUMB]) {
      fs.copyFileSync(src, `${destBase}-${size.w}.${ext.slice(1)}`);
    }
    return { detailExt: ext.slice(1), thumbExt: ext.slice(1) };
  }
  try {
    await sharp(src).resize(DETAIL.w, DETAIL.h, { fit: 'cover' }).webp({ quality: 82 }).toFile(`${destBase}-${DETAIL.w}.webp`);
    await sharp(src).resize(THUMB.w, THUMB.h, { fit: 'cover' }).webp({ quality: 78 }).toFile(`${destBase}-${THUMB.w}.webp`);
    return { detailExt: 'webp', thumbExt: 'webp' };
  } catch {
    for (const size of [DETAIL, THUMB]) fs.copyFileSync(src, `${destBase}-${size.w}${ext}`);
    return { detailExt: ext.slice(1), thumbExt: ext.slice(1) };
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
  const imgDir = path.join(outDir, 'img');
  ensureDir(imgDir);

  const map = new Map();
  let processed = 0;
  let missing = 0;

  for (const item of items) {
    const src = resolveSource(item, staticDir, rootDir);
    if (!src) {
      map.set(item.id, { detail: placeholder, thumb: placeholder });
      missing++;
      continue;
    }
    const destBase = path.join(imgDir, item.id);
    const { detailExt, thumbExt } = await renderVariants(sharp, src, destBase);
    map.set(item.id, {
      detail: `/img/${encodeURIComponent(item.id)}-${DETAIL.w}.${detailExt}`,
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
