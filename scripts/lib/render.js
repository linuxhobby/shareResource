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
  // 回发确认信标：服务端据此把「首访即走」的访客也计入 UV（信标本身不计访问量）
  try {
    if (navigator.sendBeacon) navigator.sendBeacon('/hit');
    else fetch('/hit', { method: 'POST', keepalive: true }).catch(function () {});
  } catch (e) {}
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

/** 平台图标：24×24 视口，fill currentColor（页脚只出图标，不出账号文字）。 */
const ICONS = {
  twitter:
    '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
  telegram:
    '<path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.26-1.91.177-.184 3.247-2.977 3.307-3.23.005-.03.01-.14-.052-.198-.063-.058-.155-.038-.222-.023-.094.021-1.6 1.018-4.516 2.99-.427.293-.812.436-1.157.43-.38-.007-1.113-.215-1.657-.392-.67-.218-.699-.809-.08-1.155.916-.44 2.192-1.023 3.436-1.618 1.62-.775 3.51-1.68 4.12-1.98.61-.3 1.363-.32 1.855-.186z"/>',
  email:
    '<path d="M3 6.5h18v11H3z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m3.7 7.2 8.3 6 8.3-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
};
const iconSvg = (key) =>
  ICONS[key]
    ? `<svg class="foot__icon" viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">${ICONS[key]}</svg>`
    : '';

/** 页脚联系方式：site.yaml 的 contact 写成 { 平台: 账号或链接 }。
 *  twitter 写 @用户名 或完整链接均可（统一指向 x.com）；telegram 写完整链接或 @用户名（指向 t.me）。
 *  页面上只显示图标，账号名写进 aria-label / title，不直接露出。 */
const stripUrl = (u) => u.replace(/^https?:\/\/(www\.)?/, '');
const contactItems = (contact) =>
  contact && typeof contact === 'object'
    ? Object.entries(contact)
        .filter(([, v]) => v && String(v).trim())
        .map(([rawKey, rawVal]) => {
          const key = String(rawKey).trim().toLowerCase();
          const val = String(rawVal).trim();
          const isUrl = /^https?:/.test(val);
          const user = val.replace(/^@/, '');
          if (key === 'twitter')
            return {
              label: 'Twitter',
              icon: iconSvg('twitter'),
              href: isUrl ? val : `https://x.com/${user}`,
              text: `@${isUrl ? stripUrl(val).replace(/^(x|twitter)\.com\//, '') : user}`,
            };
          if (key === 'telegram')
            return {
              label: 'Telegram',
              icon: iconSvg('telegram'),
              href: isUrl ? val : `https://t.me/${user}`,
              text: `@${isUrl ? stripUrl(val).replace(/^t\.me\//, '') : user}`,
            };
          if (key === 'email')
            return { label: '邮箱', icon: iconSvg('email'), href: `mailto:${val}`, text: val };
          return { label: rawKey, href: isUrl ? val : '', text: val };
        })
    : [];
const contactHtml = (contact) => {
  const items = contactItems(contact);
  if (!items.length) return '';
  const links = items
    .map((i) => {
      const inner = i.icon || esc(i.label);
      const aria = ` aria-label="${esc(i.label)} ${esc(i.text)}"`;
      const title = ` title="${esc(i.label)}"`;
      return i.href
        ? `<a href="${esc(i.href)}" target="_blank" rel="noopener noreferrer"${title}${aria}>${inner}</a>`
        : `<span${title}>${inner}</span>`;
    })
    .join('');
  return `<p class="foot__contact">${links}</p>`;
};

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
  assetVersion = '',
}) {
  // 静态资源带版本号：nginx 对 css/js 设了 30 天缓存，改样式后必须换 URL 才会被重新拉取
  const v = assetVersion ? `?v=${assetVersion}` : '';
  // 标题里已含站名（如首页 homeTitle）时不再重复拼接
  const fullTitle = title === site.title || title.includes(site.title) ? title : `${title} - ${site.title}`;
  const canonical = `${baseUrl}${canonicalPath}`;
  const ogImg = ogImage && ogImage.startsWith('/') ? `${baseUrl}${ogImage}` : ogImage;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="alternate icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
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
${ogImg ? `<meta name="twitter:image" content="${esc(ogImg)}">\n` : ''}<link rel="stylesheet" href="/assets/style.css${v}">
${head}
${jsonLd ? jsonLdBlock(jsonLd) : ''}
</head>
<body>
<header class="top">
  <div class="wrap${wide ? ' wrap--wide' : ''} top__inner">
    <a class="top__brand" href="/"><img class="top__logo" src="/favicon.svg" width="24" height="24" alt="">${esc(site.title)}</a>
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
  ${contactHtml(site.contact)}
</footer>
${STATS_SCRIPT[site.stats] || ''}
<script src="/assets/app.js${v}" defer></script>
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
  // 首页 SEO 文案取自 site.yaml 的 homeTitle / homeDesc / homeH1，占位符 {total}、{categories}
  const catList = (categories || []).join('、');
  const homeTitle = site.homeTitle || site.title;
  const homeDesc = String(site.homeDesc || site.description)
    .replace(/\{total\}/g, total)
    .replace(/\{categories\}/g, catList);
  const homeH1 = site.homeH1 || '全部资源';
  const newestCount = Math.min(NEWEST_BADGE, items.length);
  const indexData = (indexAll || [])
    .filter((it) => !activeCat || it.category === activeCat)
    .map((it, i) => ({ ...it, isNew: i < newestCount }));

  const heading = activeCat
    ? `<h1 class="page__title">${esc(activeCat)}<span class="page__n">${items.length} 个资源</span></h1>`
    : `<h1 class="page__title">${esc(homeH1)}<span class="page__n">${total} 个资源</span></h1>`;

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
        name: activeCat ? `${activeCat} - ${site.title}` : homeTitle,
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

  // 列表数据：只内联前两屏（够首屏 + 一次「加载更多」），剩余按需异步补齐，避免 HTML 过大导致抓取超时
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
<script type="application/json" id="list-data" data-total="${indexData.length}" data-category="${esc(activeCat)}">${JSON.stringify(indexData.slice(0, pageSize * 2)).replace(/</g, '\\u003c')}</script>`;

  return layout({
    site,
    assetVersion: ctx.assetVersion,
    title: activeCat || `${homeTitle}（${total} 项）`,
    description: activeCat
      ? `${activeCat}资源合集，共 ${items.length} 个，夸克网盘链接，扫码即存`
      : homeDesc,
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
    assetVersion: ctx.assetVersion,
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
    assetVersion: ctx.assetVersion,
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

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 页面真实更新日期：优先入库日 added，回退内容日期 date；都没有则返回空（此时不写 lastmod） */
function lastmodOf(item) {
  if (DAY_RE.test(item.added || '')) return item.added;
  if (DAY_RE.test(item.date || '')) return item.date;
  return '';
}

/** 一组资源里最新的更新日期，用作首页 / 分类页的 lastmod */
function lastmodOfList(list) {
  return list.map(lastmodOf).filter(Boolean).sort().pop() || '';
}

export function sitemapXml(baseUrl, resources, categories) {
  // lastmod 必须是页面真实变化日期：每次构建把全站刷成同一天，搜索引擎会判定为不可信并降低抓取频率
  const line = (loc, lastmod, priority) =>
    `  <url><loc>${esc(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<priority>${priority}</priority></url>`;
  const urls = [
    line(baseUrl + '/', lastmodOfList(resources), '1.0'),
    ...categories.map((c) =>
      line(
        `${baseUrl}/category/${encodeURIComponent(categorySlug(c))}/`,
        lastmodOfList(resources.filter((r) => r.category === c)),
        '0.8'
      )
    ),
    ...resources.map((r) =>
      line(`${baseUrl}/resource/${encodeURIComponent(r.id)}/`, lastmodOf(r), '0.6')
    ),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}
