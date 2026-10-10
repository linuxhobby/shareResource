import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  loadSite,
  loadResources,
  normalizeResources,
  orderCategories,
  categorySlug,
  syncHeaderCounts,
  clipDesc,
} from './lib/data.js';
import {
  prepareImages,
  writeQr,
  writeFavicon,
  copyThemeAssets,
  POSTER_WIDTHS,
} from './lib/assets.js';
import {
  listPage,
  detailPage,
  aboutPage,
  allPage,
  rssPage,
  feedXml,
  notFoundPage,
  sitemapXml,
  lastmodOfList,
  catFeedHref,
} from './lib/render.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const staticDir = path.join(root, 'static');
const themeDir = path.join(root, 'theme');
/**
 * 输出目录。默认仓库根的 public/。
 * 服务器做原子发布时会传 BUILD_DIR=public.new：先把整站构建到临时目录，
 * 全部就绪后再整体换到 public，构建过程中的半成品不会被 nginx 读到。
 */
const outDirName = process.env.BUILD_DIR || 'public';
const outDir = path.join(root, outDirName);
/**
 * 上一版产物目录，用于「内容未变就沿用」的比对。
 * 服务器做原子发布时构建到 public.new，此时上一版就是正在服务的 public/。
 * 直接构建到 public/ 时不需要它——文件本身就躺在 outDir 里，比对同一路径即可。
 */
const prevDirName = outDirName === 'public' ? '' : process.env.PREV_DIR || 'public';
const prevDir = prevDirName ? path.join(root, prevDirName) : '';

/** 本次构建沿用了多少个未变化的文件（只在最后汇总打一行） */
const reused = { kept: 0, copied: 0, written: 0 };

/**
 * 写文件，但内容没变就不覆盖。
 *
 * 为什么要这样：Nginx 对静态文件用 mtime + 大小生成 ETag / Last-Modified。
 * 每小时全量重建会把 700 多个详情页的 mtime 全部刷新，蜘蛛带 If-Modified-Since
 * / If-None-Match 来也永远不命中，每次都是完整 200 下载——抓取预算就这么被重复
 * 下载吃掉了（日志里 Google 200×810、几乎没有 304，正是这个特征）。
 * 内容不变就保留原文件与原 mtime，蜘蛛的重复访问变成 304，预算才腾得出去抓新页。
 *
 * 只比对文本产物（HTML / XML / JSON / robots）：抓取预算花在页面上；
 * 图片走的是 sharp 生成 + 30 天缓存，重建一次成本不高，不值得为它加复杂度。
 */
function write(file, content) {
  const rel = path.relative(outDir, file);
  const candidates = [file];
  if (prevDir && !rel.startsWith('..')) candidates.push(path.join(prevDir, rel));

  for (const target of candidates) {
    let old;
    try {
      old = fs.readFileSync(target, 'utf8');
    } catch {
      continue; // 不存在就试下一个候选
    }
    if (old !== content) continue;

    // 内容一致：已经在 outDir 里的直接不动，在上一版里的拷过来并沿用原 mtime
    if (target !== file) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.copyFileSync(target, file);
      const st = fs.statSync(target);
      fs.utimesSync(file, st.atime, st.mtime);
      reused.copied++;
    } else {
      reused.kept++;
    }
    return;
  }

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  reused.written++;
}

/**
 * 清理目录里的遗留文件：keep(name) 返回 true 的保留，其余删除。
 * 删除失败只计数不抛出——目录残留影响不了访问，不能让构建中断。
 */
function prune(dir, keep) {
  let removed = 0;
  let failed = 0;
  if (!fs.existsSync(dir)) return { removed, failed };
  for (const name of fs.readdirSync(dir)) {
    if (keep(name)) continue;
    try {
      fs.rmSync(path.join(dir, name), { recursive: true, force: true });
      removed++;
    } catch {
      failed++;
    }
  }
  return { removed, failed };
}

/**
 * 图标版本号：取 static/favicon.svg 的内容哈希。
 * nginx 给图片设了 30 天缓存，换 logo 后浏览器不会主动回源；
 * 内容一变 URL 就变，新 logo 立刻生效，内容不变则版本稳定、不影响缓存命中。
 */
function iconVersionOf(file) {
  try {
    return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
  } catch {
    return '';
  }
}

const t0 = Date.now();
console.log('读取数据源…');
const site = loadSite(dataDir);
/**
 * 站点域名：环境变量 BASE_URL 优先（服务器由 /etc/site-autoupdate.conf 注入），
 * 其次取 data/site.yaml 的 baseUrl，两者都没配则回退到站点默认域名。
 */
const DEFAULT_BASE_URL = 'https://www.wodewangpan.top';
const baseUrl = (process.env.BASE_URL || site.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
if (baseUrl.includes('example.com')) {
  console.log('  ! 站点域名是占位值 example.com，canonical / OG / sitemap 会指错');
  console.log('    请用 BASE_URL=... npm run build，或在 data/site.yaml 写 baseUrl: https://你的域名');
}
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
  staleFailed += prune(path.join(outDir, sub), (name) => keep.has(name)).failed;
}
if (staleFailed) {
  console.log(`  ! ${staleFailed} 个旧目录未能清理（不影响访问）；可手动执行 rm -rf ${outDirName} 后重新构建`);
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

// 配图尺寸调整后（例如详情页不再单独出 180 宽），旧宽度的文件会一直躺在 public/img
// 里越积越多，这里按当前宽度集合清理掉遗留版本
{
  const keepW = new Set(POSTER_WIDTHS.map(String));
  const { removed: staleImg } = prune(path.join(outDir, 'img'), (name) => {
    const m = /^(.*)-(\d+)\.(?:webp|jpe?g|png|avif|gif|svg)$/i.exec(name);
    return !m || keepW.has(m[2]);
  });
  if (staleImg) console.log(`  · 已清理 ${staleImg} 个旧尺寸配图（当前生成宽度：${POSTER_WIDTHS.join('/')}）`);
}

if (await writeFavicon(staticDir, outDir)) console.log('  · 已生成 favicon.svg / favicon.ico / apple-touch-icon.png');

// 首页分享卡：仓库里预渲染好的图直接拷到根目录（不依赖构建机的中文字体）
const shareSrc = path.join(staticDir, 'share.jpg');
const shareImage = fs.existsSync(shareSrc) ? '/share.jpg' : '';
if (shareImage) {
  fs.copyFileSync(shareSrc, path.join(outDir, 'share.jpg'));
  console.log('  · 已复制首页分享卡 share.jpg');
} else {
  console.log('  ! 未找到 static/share.jpg，首页分享图将回退为最新资源的配图');
}

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
    desc: clipDesc(it.description, 40),
    href: `/resource/${encodeURIComponent(it.id)}/`,
    date: it.date,
    thumb: img.thumb || '/img/placeholder.svg',
    card: img.card || '/img/placeholder.svg',
    ...(py || {}),
  };
});

/** 静态资源版本号：用当前 commit，同一次构建内所有页面一致；取不到 git 时退回时间戳 */
const assetVersion = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return Date.now().toString(36);
  }
})();

const iconVersion = iconVersionOf(path.join(staticDir, 'favicon.svg'));
console.log(`  · 图标版本：${iconVersion || '未取到（回退到构建版本号）'}`);

const ctxBase = {
  site,
  categories,
  counts,
  total,
  items,
  images,
  baseUrl,
  indexAll,
  assetVersion,
  iconVersion,
  shareImage,
};

// 列表页与分类 RSS 各自都要按分类取子集，分组一次省掉两遍 filter
const byCat = new Map(categories.map((c) => [c, []]));
for (const it of items) {
  if (!byCat.has(it.category)) byCat.set(it.category, []);
  byCat.get(it.category).push(it);
}

console.log('生成列表页…');
write(path.join(outDir, 'index.html'), listPage({ ...ctxBase, activeCat: '', pageSize: site.pageSize }));
for (const cat of categories) {
  const file = path.join(outDir, 'category', categorySlug(cat), 'index.html');
  write(file, listPage({ ...ctxBase, items: byCat.get(cat), activeCat: cat, pageSize: site.pageSize }));
}

console.log('生成详情页…');
for (const item of items) {
  write(
    path.join(outDir, 'resource', item.id, 'index.html'),
    detailPage({ ...ctxBase, item, qrLinks: qrMap.get(item.id) || [] })
  );
}

console.log('生成关于本站 / RSS 页面…');
// 全量索引页：蜘蛛不用执行 JS 就能走完全部详情页的通道（列表页首屏之外的内容靠 JS 补齐）
write(path.join(outDir, 'all', 'index.html'), allPage(ctxBase));
write(path.join(outDir, 'about', 'index.html'), aboutPage(ctxBase));
write(path.join(outDir, 'rss', 'index.html'), rssPage(ctxBase));

// RSS 源：全站一份 + 每个分类一份，条目里带上配图与转存链接
/** 给 feed 用的资源视图（补上绝对配图路径） */
const feedItems = items.map((it) => ({ ...it, poster: (images.get(it.id) || {}).detail || '' }));
write(
  path.join(outDir, 'feed.xml'),
  feedXml({
    site,
    items: feedItems,
    baseUrl,
    categories,
    feedPath: '/feed.xml',
    title: `${site.title} · 最新资源`,
    description: site.description || `${site.title}最新入库的网盘资源`,
  })
);
for (const cat of categories) {
  const list = feedItems.filter((i) => i.category === cat);
  write(
    path.join(outDir, 'category', categorySlug(cat), 'feed.xml'),
    feedXml({
      site,
      items: list,
      baseUrl,
      categories: [cat],
      feedPath: catFeedHref(cat),
      title: `${site.title} · ${cat}`,
      description: `${site.title}的${cat}分类，共 ${list.length} 个资源`,
    })
  );
}

console.log('生成搜索索引与附加文件…');
write(path.join(outDir, 'search-index.json'), JSON.stringify(indexAll));
write(path.join(outDir, '404.html'), notFoundPage(ctxBase));
write(
  path.join(outDir, 'robots.txt'),
  // Disallow /*?q= ：搜索结果页 /?q=关键词 与首页/分类页内容高度重合，
  // 会被当成重复内容白白吃掉抓取配额，主流搜索引擎都建议用 robots 挡掉。
  // 必须写 ?q= 而不是 q=，否则任何路径里含 "q=" 的正常页面会被误伤
  //
  // /stats.json 与 /hit 是访问统计端点，对收录毫无价值，挡掉省下抓取预算。
  //
  // /*/search-index.json 只挡子路径，根目录那份必须留：
  // 蜘蛛日志里对它的请求曾出现一批 404，根因是 app.js 早期用相对路径取索引，
  // 在 /resource/<id>/、/category/<slug>/ 下解析成不存在的子路径（已改为根绝对路径修掉），
  // 蜘蛛仍按记忆反复重试这些残留 URL。这里挡掉子路径促其衰减，
  // 根目录的 /search-index.json 仍是 Googlebot 渲染「加载更多」的通道，不能一起废掉
  // （配合 deploy/nginx-site.conf.example 里对该模式的 410，不依赖引擎是否支持通配）。
  `User-agent: *\nAllow: /\nDisallow: /*?q=\nDisallow: /stats.json\nDisallow: /hit\nDisallow: /*/search-index.json\nSitemap: ${baseUrl}/sitemap.xml\n`
);
write(
  path.join(outDir, 'sitemap.xml'),
  sitemapXml(baseUrl, items, categories, [
    { path: '/about/', priority: '0.5' },
    { path: '/rss/', priority: '0.4' },
    // 全量索引页：给蜘蛛一条不依赖 JS 就能走完全部详情页的通道
    { path: '/all/', priority: '0.4', lastmod: lastmodOfList(items) },
  ])
);
copyThemeAssets(themeDir, outDir);

// app.js 是 ES module，会再 import 同目录的 card.js（卡片模板）。
// nginx 对 .js 统一缓存 30 天，这个二级请求也得带版本号，否则改了模板用户浏览器还拿旧的。
{
  const appFile = path.join(outDir, 'assets', 'app.js');
  const src = fs.readFileSync(appFile, 'utf8');
  const patched = src.replace("'./card.js'", `'./card.js?v=${assetVersion}'`);
  if (patched === src) console.log('  ! app.js 里没找到 ./card.js 的 import，卡片模板改版后不会破缓存');
  fs.writeFileSync(appFile, patched);
}

// 拷贝 QQ 群二维码：关于本站页展示大图，页脚通过 QQ 群链接轻量入口跳转
const qqGroupSrc = path.join(staticDir, 'qq-group.png');
const qqGroupDest = path.join(outDir, 'qq-group.png');
if (fs.existsSync(qqGroupSrc)) {
  fs.copyFileSync(qqGroupSrc, qqGroupDest);
} else {
  console.log('  ! 未找到 static/qq-group.png，关于本站页将不显示 QQ 群二维码');
}

const reusedTotal = reused.kept + reused.copied;
if (reusedTotal) {
  console.log(
    `  · 未变化文件沿用原样（保留 mtime，蜘蛛可命中 304）：${reusedTotal} 个` +
      (reused.copied ? `（从 ${prevDirName}/ 沿用 ${reused.copied} 个）` : '') +
      `；重新生成 ${reused.written} 个`
  );
}
console.log(
  `\n完成：${total} 个资源 · ${categories.length} 个分类 · ${((Date.now() - t0) / 1000).toFixed(1)}s\n输出目录：${outDirName}/`
);
console.log(`本地预览：npm run serve  → http://localhost:4321  （站点：${site.title}）`);
