import { categorySlug } from './data.js';

/** 列表最前面多少条打「最新」角标 */
const NEWEST_BADGE = 6;

/** 不蒜子访问统计（site.yaml 里 stats: busuanzi 时启用）；脚本加载失败时数字保持占位符，不影响页面 */
const BUSUANZI_HTML =
  '<p class="foot__stat">总访问量 <span id="busuanzi_value_site_pv">–</span> · 访客数 <span id="busuanzi_value_site_uv">–</span></p>';
const BUSUANZI_SCRIPT = '<script async src="//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>';

/** 本地访问统计（stats: local）：读取 VPS 上由 nginx 日志生成的 /stats.json，不依赖任何第三方。
 *  同时种一年期 vid cookie 供服务端区分访客；接口不可用时数字保持占位符，不影响页面 */
const LOCAL_STATS_HTML =
  '<p class="foot__stat">总访问量 <span id="stat-pv">–</span> · 访客数 <span id="stat-uv">–</span>' +
  ' · 今日 <span id="stat-tpv">–</span> · 访客 <span id="stat-tuv">–</span></p>';
const LOCAL_STATS_SCRIPT = `<script>
(function () {
  var exp = new Date(Date.now() + 31536000000).toUTCString();
  if (!/(^|; )vid=/.test(document.cookie)) {
    document.cookie = 'vid=v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10) +
      '; expires=' + exp + '; path=/; SameSite=Lax';
  }
  fetch('/stats.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (s) {
      var m = { 'stat-pv': s.pv, 'stat-uv': s.uv, 'stat-tpv': s.today_pv, 'stat-tuv': s.today_uv };
      for (var id in m) {
        var el = document.getElementById(id);
        if (el && m[id] != null) el.textContent = m[id];
      }
    })
    .catch(function () {});
})();
</script>`;
const STATS_HTML = { busuanzi: BUSUANZI_HTML, local: LOCAL_STATS_HTML };
const STATS_SCRIPT = { busuanzi: BUSUANZI_SCRIPT, local: LOCAL_STATS_SCRIPT };

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function catHref(category) {
  return `/category/${encodeURIComponent(categorySlug(category))}/`;
}

function catNav(site, categories, counts, activeCat, total, wide) {
  const items = [
    `<a class="cat${activeCat ? '' : ' is-on'}" href="/">全部<span class="cat__n">${total}</span></a>`,
    ...categories.map(
      (c) =>
        `<a class="cat${c === activeCat ? ' is-on' : ''}" href="${catHref(c)}">${esc(c)}<span class="cat__n">${counts.get(c) || 0}</span></a>`
    ),
  ];
  return `<nav class="cats${wide ? ' cats--wide' : ''}" aria-label="分类">${items.join('')}</nav>`;
}

/** 分类 → schema.org 类型，帮助搜索引擎理解资源类型 */
const SCHEMA_TYPE = { 电影: 'Movie', 电视剧: 'TVSeries', 纪录片: 'TVSeries' };

function jsonLdBlock(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

function layout({
  site,
  title,
  description,
  activeCat,
  categories,
  counts,
  total,
  body,
  head = '',
  wide = false,
  baseUrl = '',
  canonicalPath = '/',
  ogImage = '',
  ogType = 'website',
  jsonLd = null,
  keywords = '',
  noindex = false,
}) {
  const fullTitle = title === site.title ? site.title : `${title} - ${site.title}`;
  const canonical = `${baseUrl}${canonicalPath}`;
  const ogImg = ogImage && ogImage.startsWith('/') ? `${baseUrl}${ogImage}` : ogImage;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || site.description)}">
${keywords ? `<meta name="keywords" content="${esc(keywords)}">\n` : ''}<meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow'}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="theme-color" content="#4B3FE3">
<meta property="og:type" content="${esc(ogType)}">
<meta property="og:site_name" content="${esc(site.title)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description || site.description)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:locale" content="zh_CN">
${ogImg ? `<meta property="og:image" content="${esc(ogImg)}">\n` : ''}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fullTitle)}">
<meta name="twitter:description" content="${esc(description || site.description)}">
${ogImg ? `<meta name="twitter:image" content="${esc(ogImg)}">\n` : ''}<link rel="stylesheet" href="/assets/style.css">
${head}
${jsonLd ? jsonLdBlock(jsonLd) : ''}
</head>
<body>
<header class="top">
  <div class="wrap${wide ? ' wrap--wide' : ''} top__inner">
    <a class="top__brand" href="/">${esc(site.title)}</a>
    <form class="top__search" role="search" onsubmit="return false">
      <input id="q" type="search" placeholder="搜索资源…" autocomplete="off" aria-label="搜索资源">
    </form>
  </div>
</header>
${catNav(site, categories, counts, activeCat, total, wide)}
<main class="wrap${wide ? ' wrap--wide' : ''}">
${body}
</main>
<footer class="foot wrap${wide ? ' wrap--wide' : ''}">
  <p>共 ${total} 个资源 · ${esc(site.disclaimer)}</p>
  ${site.icp ? `<p class="foot__icp">${esc(site.icp)}</p>` : ''}
  ${STATS_HTML[site.stats] || ''}
</footer>
${STATS_SCRIPT[site.stats] || ''}
<script src="/assets/app.js" defer></script>
</body>
</html>
`;
}

/** 宫格卡片（海报墙）：最新资源排在最前，前 newest 条打「最新」角标 */
export function cardHtml(item, images, isNew = false, eager = false) {
  const img = images.get(item.id) || {};
  const loading = eager ? 'eager" fetchpriority="high' : 'lazy';
  return `<li class="tile-item">
  <a class="tile" href="/resource/${encodeURIComponent(item.id)}/">
    <span class="tile__poster">
      <img class="tile__img" src="${esc(img.card || img.thumb)}" width="240" height="360" alt="${esc(item.title)}" loading="${loading}" decoding="async">
      ${isNew ? '<span class="tile__new">最新</span>' : ''}
    </span>
    <span class="tile__title">${esc(item.title)}</span>
    <span class="tile__meta">${esc(item.category)}${item.date ? ` · ${esc(item.date)}` : ''}</span>
  </a>
</li>`;
}

export function listPage(ctx) {
  const { site, items, categories, counts, activeCat, total, pageSize, images, baseUrl, indexAll } = ctx;
  const first = items.slice(0, pageSize);
  const newestCount = Math.min(NEWEST_BADGE, items.length);
  const indexData = (indexAll || [])
    .filter((it) => !activeCat || it.category === activeCat)
    .map((it, i) => ({ ...it, isNew: i < newestCount }));

  const heading = activeCat
    ? `<h1 class="page__title">${esc(activeCat)}<span class="page__n">${items.length} 个资源</span></h1>`
    : `<h1 class="page__title">全部资源<span class="page__n">${total} 个资源</span></h1>`;

  const canonicalPath = activeCat ? `/category/${encodeURIComponent(categorySlug(activeCat))}/` : '/';
  const typeLabel = activeCat ? `${activeCat}资源` : '网盘资源';
  const firstImg = (images.get(items[0] && items[0].id) || {}).card || '';

  // 结构化数据：站点（含搜索框）+ 当前列表
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: `${baseUrl}/`,
        name: site.title,
        description: site.description,
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${baseUrl}/?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'CollectionPage',
        '@id': `${baseUrl}${canonicalPath}#page`,
        url: `${baseUrl}${canonicalPath}`,
        name: activeCat ? `${activeCat} - ${site.title}` : site.title,
        isPartOf: { '@id': `${baseUrl}/#website` },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: items.length,
          itemListElement: items.slice(0, 30).map((it, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${baseUrl}/resource/${encodeURIComponent(it.id)}/`,
            name: it.title,
          })),
        },
      },
    ],
  };

  const body = `${heading}
<div id="results" class="results" hidden></div>
<ul id="list" class="grid">
${first.map((it, i) => cardHtml(it, images, i < newestCount, i < 5)).join('\n')}
</ul>
${
  items.length > pageSize
    ? `<button id="more" class="btn btn--more" type="button" data-page-size="${pageSize}">加载更多（剩余 ${items.length - pageSize}）</button>`
    : ''
}
${items.length === 0 ? '<p class="empty">该分类下暂无资源</p>' : ''}
<script type="application/json" id="list-data">${JSON.stringify(indexData).replace(/</g, '\\u003c')}</script>`;

  return layout({
    site,
    title: activeCat || site.title,
    description: activeCat
      ? `${activeCat}资源合集，共 ${items.length} 个，夸克网盘链接，扫码即存`
      : site.description,
    activeCat,
    categories,
    counts,
    total,
    body,
    wide: true,
    baseUrl,
    canonicalPath,
    ogImage: firstImg,
    jsonLd,
    keywords: activeCat ? `${activeCat},${typeLabel}` : categories.join(','),
  });
}

function linkRow(link) {
  const code = link.code
    ? `<span class="linkrow__code">提取码 <b>${esc(link.code)}</b><button class="btn btn--mini" type="button" data-copy="${esc(link.code)}">复制</button></span>`
    : '';
  return `<div class="linkrow">
  <span class="linkrow__name">${esc(link.name)}</span>
  <code class="linkrow__url">${esc(link.url)}</code>
  ${code}
  <a class="btn" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">打开</a>
  <button class="btn btn--primary" type="button" data-copy="${esc(link.url)}">复制链接</button>
</div>`;
}

export function detailPage(ctx) {
  const { site, item, categories, counts, total, images, qrLinks, baseUrl } = ctx;
  const img = images.get(item.id) || {};
  const primary = qrLinks[0];

  const qrSwitch =
    qrLinks.length > 1
      ? `<div class="qrbox__switch">${qrLinks
          .map(
            (l, i) =>
              `<button class="qrbtn${i === 0 ? ' is-on' : ''}" type="button" data-qr="${esc(l.qr)}" data-cap="扫码转存 · ${esc(l.name)}">${esc(l.name)}</button>`
          )
          .join('')}</div>`
      : '';

  const qrBlock = primary
    ? `<div class="qrbox">
  <img id="qrImg" class="qrbox__img" src="${esc(primary.qr)}" width="120" height="120" alt="${esc(primary.name)}二维码">
  <div class="qrbox__cap" id="qrCap">扫码转存 · ${esc(primary.name)}</div>
  ${qrSwitch}
</div>`
    : '';

  const body = `<nav class="crumb"><a href="/">首页</a><span>/</span><a href="${catHref(item.category)}">${esc(item.category)}</a></nav>
<article class="card detail">
  <div class="detail__media">
    <img class="poster" src="${esc(img.detail)}" width="180" height="260" alt="${esc(item.title)}海报" decoding="async" fetchpriority="high">
    ${qrBlock}
  </div>
  <div class="detail__main">
    <h1 class="detail__title">${esc(item.title)}</h1>
    <div class="tags">
      <a class="tag tag--cat" href="${catHref(item.category)}">${esc(item.category)}</a>
      ${item.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}
      ${item.date ? `<span class="tag tag--plain">${esc(item.date)}</span>` : ''}
    </div>
    <p class="detail__desc">${esc(item.description) || '<span class="muted">暂无介绍</span>'}</p>
    <div class="links">
      ${item.links.length ? item.links.map(linkRow).join('\n') : '<p class="muted">暂无可用链接</p>'}
    </div>
  </div>
</article>`;

  const canonicalPath = `/resource/${encodeURIComponent(item.id)}/`;
  const schemaType = SCHEMA_TYPE[item.category] || 'CreativeWork';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': schemaType,
        '@id': `${baseUrl}${canonicalPath}#resource`,
        name: item.title,
        url: `${baseUrl}${canonicalPath}`,
        description: item.description.slice(0, 200) || item.title,
        genre: item.tags.filter((t) => t !== item.category),
        ...(img.detail ? { image: `${baseUrl}${img.detail}` } : {}),
        ...(item.date ? { datePublished: item.date } : {}),
        inLanguage: 'zh-CN',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: site.title, item: `${baseUrl}/` },
          {
            '@type': 'ListItem',
            position: 2,
            name: item.category,
            item: `${baseUrl}${catHref(item.category)}`,
          },
          { '@type': 'ListItem', position: 3, name: item.title },
        ],
      },
    ],
  };

  return layout({
    site,
    title: item.title,
    description: `${item.category} · ${item.description.slice(0, 160) || item.title}`,
    activeCat: item.category,
    categories,
    counts,
    total,
    body,
    baseUrl,
    canonicalPath,
    ogType: 'article',
    ogImage: img.detail,
    jsonLd,
    keywords: [item.title, item.category, ...item.tags].slice(0, 8).join(','),
  });
}

export function notFoundPage(ctx) {
  const { site, categories, counts, total } = ctx;
  return layout({
    site,
    title: '页面不存在',
    description: site.description,
    activeCat: '',
    categories,
    counts,
    total,
    body: `<div class="card empty-card"><p class="empty">页面不存在</p><a class="btn btn--primary" href="/">返回首页</a></div>`,
    noindex: true,
  });
}

export function sitemapXml(baseUrl, resources, categories) {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: baseUrl + '/', priority: '1.0' },
    ...categories.map((c) => ({
      loc: `${baseUrl}/category/${encodeURIComponent(categorySlug(c))}/`,
      priority: '0.8',
    })),
    ...resources.map((r) => ({
      loc: `${baseUrl}/resource/${encodeURIComponent(r.id)}/`,
      priority: '0.6',
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${esc(u.loc)}</loc><lastmod>${lastmod}</lastmod><priority>${u.priority}</priority></url>`
  )
  .join('\n')}
</urlset>
`;
}
