import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadSite,
  loadResources,
  normalizeResources,
  orderCategories,
  categorySlug,
  syncHeaderCounts,
} from './lib/data.js';
import { prepareImages, writeQr, copyThemeAssets } from './lib/assets.js';
import {
  listPage,
  detailPage,
  notFoundPage,
  sitemapXml,
  esc,
} from './lib/render.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const staticDir = path.join(root, 'static');
const themeDir = path.join(root, 'theme');
const outDir = path.join(root, 'public');
const baseUrl = (process.env.BASE_URL || 'https://example.com').replace(/\/+$/, '');
if (baseUrl.includes('example.com')) {
  console.log('  ! 未设置 BASE_URL，canonical / OG / sitemap 会指向 example.com');
  console.log('    正式构建请用：BASE_URL=https://你的域名 npm run build');
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

const t0 = Date.now();
console.log('读取数据源…');
const site = loadSite(dataDir);
const raw = loadResources(dataDir);
const synced = syncHeaderCounts(dataDir);
if (synced.length) console.log(`  · 条数注释已刷新：${synced.join('、')}`);
const { items, counts } = normalizeResources(raw);
const categories = orderCategories(site, counts);
const total = items.length;

if (!total) {
  console.error('! data/ 目录下没有解析到任何资源，请检查 YAML');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

// 只清理已删除资源 / 分类的旧目录，其余文件直接覆盖；清理失败不影响构建
const keepIds = new Set(items.map((i) => i.id));
const keepCats = new Set(categories.map(categorySlug));
let staleFailed = 0;
for (const [sub, keep] of [['resource', keepIds], ['category', keepCats]]) {
  const dir = path.join(outDir, sub);
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    if (keep.has(name)) continue;
    try {
      fs.rmSync(path.join(dir, name), { recursive: true, force: true });
    } catch {
      staleFailed++;
    }
  }
}
if (staleFailed) {
  console.log(`  ! ${staleFailed} 个旧目录未能清理（不影响访问）；可手动执行 rm -rf public 后重新构建`);
}

// 拼音索引：构建期生成，供站内搜索支持「全拼 / 首字母」输入（产物里只存字符串，不带词典）
let toPinyin = null;
try {
  const { pinyin } = await import('pinyin-pro');
  toPinyin = (text) => ({
    py: pinyin(text, { toneType: 'none', type: 'array' }).join(''),
    py1: pinyin(text, { pattern: 'first', toneType: 'none', type: 'array' }).join(''),
  });
} catch {
  console.log('  ! 未安装 pinyin-pro，站内搜索将不支持拼音（npm i -D pinyin-pro 可开启）');
}

console.log(`处理配图（${total} 条）…`);
const { map: images, missing } = await prepareImages(items, { staticDir, rootDir: root, outDir });
if (missing) console.log(`  · ${missing} 条缺少配图，使用占位图`);

console.log('生成二维码…');
const qrMap = new Map();
for (const item of items) {
  qrMap.set(item.id, await writeQr(item, outDir));
}

// 全站索引：列表页内联（首屏离线可用）+ search-index.json（搜索全站）
const indexAll = items.map((it) => {
  const img = images.get(it.id) || {};
  const py = toPinyin ? toPinyin(`${it.title}${it.tags.join('')}`) : null;
  return {
    id: it.id,
    title: it.title,
    category: it.category,
    tags: it.tags,
    desc: it.description.length > 40 ? `${it.description.slice(0, 40)}…` : it.description,
    href: `/resource/${encodeURIComponent(it.id)}/`,
    date: it.date,
    thumb: img.thumb || '/img/placeholder.svg',
    card: img.card || '/img/placeholder.svg',
    ...(py || {}),
  };
});

const ctxBase = { site, categories, counts, total, images, baseUrl, indexAll };

console.log('生成列表页…');
write(path.join(outDir, 'index.html'), listPage({ ...ctxBase, items, activeCat: '', pageSize: site.pageSize }));
for (const cat of categories) {
  const list = items.filter((i) => i.category === cat);
  const file = path.join(outDir, 'category', categorySlug(cat), 'index.html');
  write(file, listPage({ ...ctxBase, items: list, activeCat: cat, pageSize: site.pageSize }));
}

console.log('生成详情页…');
for (const item of items) {
  write(
    path.join(outDir, 'resource', item.id, 'index.html'),
    detailPage({ ...ctxBase, item, qrLinks: qrMap.get(item.id) || [] })
  );
}

console.log('生成搜索索引与附加文件…');
write(path.join(outDir, 'search-index.json'), JSON.stringify(indexAll));
write(path.join(outDir, '404.html'), notFoundPage(ctxBase));
write(
  path.join(outDir, 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`
);
write(path.join(outDir, 'sitemap.xml'), sitemapXml(baseUrl, items, categories));
copyThemeAssets(themeDir, outDir);

console.log(
  `\n完成：${total} 个资源 · ${categories.length} 个分类 · ${((Date.now() - t0) / 1000).toFixed(1)}s\n输出目录：public/`
);
console.log(`本地预览：npm run serve  → http://localhost:4321  （站点：${esc(site.title)}）`);
