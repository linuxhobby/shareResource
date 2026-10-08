import { categorySlug } from './data.js';

/** 列表最前面多少条打「最新」角标 */
const NEWEST_BADGE = 6;

/** 页脚访问统计（site.yaml 里 stats: local 时启用）：读取 VPS 上由 nginx 日志生成的 /stats.json，不依赖任何第三方。
 *  同时种一年期 vid cookie 供服务端区分访客；接口不可用时数字保持占位符，不影响页面 */
const STATS_HTML =
  '<p class="foot__stat">总访问量 <span id="stat-pv">–</span> · 访客数 <span id="stat-uv">–</span>' +
  ' · 今日 <span id="stat-tpv">–</span> · 访客 <span id="stat-tuv">–</span></p>';
const STATS_SCRIPT = `<script>
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

/** 页脚导航：全站每页底部的固定入口 */
const FOOT_NAV = [
  { href: '/', label: '网站首页' },
  { href: '/about/', label: '关于本站' },
  { href: '/sitemap.xml', label: '网站地图' },
  { href: '/rss/', label: 'RSS订阅' },
];
const footNav = (current = '') =>
  `<nav class="foot__nav" aria-label="站点导航">${FOOT_NAV.map(
    (i, n) =>
      `${n ? '<span class="foot__sep" aria-hidden="true">|</span>' : ''}<a href="${esc(i.href)}"${
        i.href === current ? ' aria-current="page"' : ''
      }>${esc(i.label)}</a>`
  ).join('')}</nav>`;

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
  ogImageSize = null,
  ogType = 'website',
  jsonLd = null,
  keywords = '',
  noindex = false,
  assetVersion = '',
  footNavCurrent = '',
  rssHref = '/feed.xml',
  iconVersion = '',
}) {
  // 静态资源带版本号：nginx 对 css/js/图片设了 30 天缓存，改了必须换 URL 才会被重新拉取
  const v = assetVersion ? `?v=${assetVersion}` : '';
  // 图标按文件内容取版本：只换 logo 时也能立刻破掉浏览器缓存，不必等 css 版本号变化
  const iv = iconVersion ? `?v=${iconVersion}` : v;
  // 标题里已含站名（如首页 homeTitle）时不再重复拼接
  const fullTitle = title === site.title || title.includes(site.title) ? title : `${title} - ${site.title}`;
  const canonical = `${baseUrl}${canonicalPath}`;
  const ogImg = ogImage && ogImage.startsWith('/') ? `${baseUrl}${ogImage}` : ogImage;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="/favicon.svg${iv}" type="image/svg+xml">
<link rel="alternate icon" href="/favicon.ico${iv}" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png${iv}">
${
  rssHref
    ? `<link rel="alternate" type="application/rss+xml" title="${esc(site.title)} RSS" href="/${rssHref.replace(/^\//, '')}">\n`
    : ''
}<title>${esc(fullTitle)}</title>
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
${ogImg ? `<meta property="og:image" content="${esc(ogImg)}">\n` : ''}${ogImg && ogImageSize ? `<meta property="og:image:width" content="${ogImageSize.w}">\n<meta property="og:image:height" content="${ogImageSize.h}">\n` : ''}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(fullTitle)}">
<meta name="twitter:description" content="${esc(description || site.description)}">
${ogImg ? `<meta name="twitter:image" content="${esc(ogImg)}">\n` : ''}<link rel="stylesheet" href="/assets/style.css${v}">
${head}
${jsonLd ? jsonLdBlock(jsonLd) : ''}
</head>
<body>
<header class="top">
  <div class="wrap${wide ? ' wrap--wide' : ''} top__inner">
    <a class="top__brand" href="/"><img class="top__logo" src="/favicon.svg${iv}" width="24" height="24" alt="">${esc(site.title)}</a>
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
  ${footNav(footNavCurrent)}
  ${site.stats === 'local' ? STATS_HTML : ''}
  <p>共 ${total} 个资源 · ${esc(site.disclaimer)}</p>
  ${site.icp ? `<p class="foot__icp">${esc(site.icp)}</p>` : ''}
  ${contactHtml(site.contact)}
</footer>
${site.stats === 'local' ? STATS_SCRIPT : ''}
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
  const { site, items, categories, counts, activeCat, total, pageSize, images, baseUrl, indexAll, shareImage } = ctx;
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
    iconVersion: ctx.iconVersion,
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
    ogImage: activeCat ? firstImg : shareImage || firstImg,
    ogImageSize: activeCat || !shareImage ? null : { w: 1200, h: 630 },
    jsonLd,
    keywords: activeCat ? `${activeCat},${typeLabel}` : categories.join(','),
    rssHref: activeCat ? `/category/${encodeURIComponent(categorySlug(activeCat))}/feed.xml` : '/feed.xml',
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
    <img class="poster" src="${esc(img.detail)}" width="240" height="360" alt="${esc(item.title)}海报" decoding="async" fetchpriority="high">
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
    iconVersion: ctx.iconVersion,
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
    rssHref: `/category/${encodeURIComponent(categorySlug(item.category))}/feed.xml`,
    // 详情页与首页/分类页同宽容器，海报卡片左右边线才能严格对齐
    wide: true,
    footNavCurrent: `/resource/${encodeURIComponent(item.id)}/`,
  });
}

export function notFoundPage(ctx) {
  const { site, categories, counts, total } = ctx;
  return layout({
    site,
    assetVersion: ctx.assetVersion,
    iconVersion: ctx.iconVersion,
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

/* ── 独立页面：关于本站 / RSS 订阅 ─────────── */

/** RSS 2.0 的日期必须是 RFC 822（如 Sat, 08 Oct 2026 07:00:00 GMT） */
function rfc822(value) {
  const d = value instanceof Date ? value : new Date(String(value || '').trim().replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? '' : d.toUTCString();
}

/** RSS 里最多放多少条（够订阅器拉取，也不至于让文件过大） */
const RSS_MAX = 50;

/**
 * RSS 2.0 源：全站或单个分类的最新资源。
 * description 里放海报 + 简介 + 网盘链接，订阅器里直接能看到转存入口。
 */
export function feedXml({ site, items, baseUrl, categories, feedPath = '/feed.xml', title, description }) {
  const self = `${baseUrl}${feedPath}`;
  const homeLink = `${baseUrl}/`;
  const itemsXml = items
    .slice(0, RSS_MAX)
    .map((it) => {
      const url = `${baseUrl}/resource/${encodeURIComponent(it.id)}/`;
      const poster = it.poster ? `${baseUrl}${it.poster}` : '';
      const links = (it.links || [])
        .map(
          (l) =>
            `<p>${esc(l.name)}${l.code ? `（提取码 ${esc(l.code)}）` : ''}：<a href="${esc(l.url)}">${esc(l.url)}</a></p>`
        )
        .join('');
      const desc = [
        poster ? `<p><img src="${esc(poster)}" width="240" alt="${esc(it.title)}"></p>` : '',
        it.description ? `<p>${esc(it.description)}</p>` : '',
        links,
      ]
        .filter(Boolean)
        .join('');
      return `  <item>
    <title>${esc(it.title)}</title>
    <link>${esc(url)}</link>
    <guid isPermaLink="true">${esc(url)}</guid>
    <pubDate>${rfc822(it.added || it.date)}</pubDate>
    <category>${esc(it.category)}</category>
    <description><![CDATA[${desc}]]></description>
  </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(title || site.title)}</title>
  <link>${esc(homeLink)}</link>
  <description>${esc(description || site.description)}</description>
  <language>zh-CN</language>
  <lastBuildDate>${rfc822(lastmodOfList(items))}</lastBuildDate>
  <atom:link href="${esc(self)}" rel="self" type="application/rss+xml"/>
${(categories || [])
  .map((c) => `  <category>${esc(c)}</category>`)
  .join('\n')}
${itemsXml}
</channel>
</rss>
`;
}

/** RSS 订阅地址一行：地址 + 复制按钮 + 直接打开 */
function feedRow(baseUrl, href, label, note = '') {
  const url = `${baseUrl}${href}`;
  return `<div class="feed-url">
  <span class="feed-url__label">${esc(label)}${note ? `<span class="muted"> · ${esc(note)}</span>` : ''}</span>
  <code class="feed-url__code">${esc(url)}</code>
  <a class="btn" href="${esc(href)}" target="_blank" rel="noopener noreferrer">打开</a>
  <button class="btn btn--primary" type="button" data-copy="${esc(url)}">复制地址</button>
</div>`;
}

export function aboutPage(ctx) {
  const { site, categories, counts, total, items, baseUrl } = ctx;
  const updated = lastmodOfList(items);
  const newest = items.slice(0, 5);
  const catRows = (categories || [])
    .map(
      (c) =>
        `<tr><th scope="row">${esc(c)}</th><td>${counts.get(c) || 0} 个</td><td><a href="${catHref(c)}">查看</a> · <a href="/category/${encodeURIComponent(categorySlug(c))}/feed.xml">RSS</a></td></tr>`
    )
    .join('\n');

  const body = `<nav class="crumb"><a href="/">首页</a><span>/</span><span>关于本站</span></nav>
<h1 class="page__title">关于本站</h1>
<div class="card-page">
  <p><strong>${esc(site.title)}</strong> 是一个纯静态的网盘资源索引站：把散落在各处的夸克 / 百度 / 阿里云盘资源整理成条目，
  统一给出海报、简介、标签和转存链接，打开网页即可直接使用，无需注册登录。</p>

  <h2>站点概况</h2>
  <ul>
    <li>已收录资源：<strong>${total}</strong> 个</li>
    <li>资源分类：<strong>${(categories || []).length}</strong> 类（${(categories || []).join('、')}）</li>
    <li>最近更新：${updated ? `<strong>${esc(updated)}</strong>` : '暂无记录'}</li>
    <li>整站纯静态：页面预先生成，加载快、无广告、不追踪个人信息</li>
  </ul>

  <h2>怎么用</h2>
  <ol>
    <li>首页或分类页浏览海报，也可以直接用顶部搜索框按片名、标签搜索（支持拼音首字母）。</li>
    <li>点进资源页，用手机<strong>扫码</strong>或点「复制链接」粘贴到浏览器，即可转存到自己的网盘。</li>
    <li>部分资源有提取码，页面上标明并附带一键复制按钮。</li>
  </ol>

  <h2>分类一览</h2>
  <table>
    <thead><tr><th scope="col">分类</th><th scope="col">数量</th><th scope="col">入口</th></tr></thead>
    <tbody>
${catRows}
    </tbody>
  </table>

  <h2>内容来源与版权</h2>
  <p>${esc(site.disclaimer)}。本站不存储任何影片、软件或电子书本体，所有文件均存放在第三方网盘上；
  若你是版权方或发现链接失效，欢迎通过下方方式联系，我们会在核实后第一时间处理。</p>

  <h2>订阅与推荐</h2>
  <p>新资源入库后可以 RSS 订阅，不必每天来刷页面：<a href="/rss/">查看 RSS 订阅方式与地址</a>。
  觉得有用也可以把首页加入浏览器书签，便于随时回来找资源。</p>

  <h2>最新入库</h2>
  <ul>
${newest
  .map(
    (it) =>
      `<li><a href="/resource/${encodeURIComponent(it.id)}/">${esc(it.title)}</a><span class="muted"> · ${esc(it.category)}${it.added ? ` · ${esc(it.added)}` : ''}</span></li>`
  )
  .join('\n')}
  </ul>

  <p class="muted">${esc(site.title)} · <a href="${esc(baseUrl)}/">${esc(baseUrl)}</a></p>
</div>`;

  return layout({
    site,
    assetVersion: ctx.assetVersion,
    iconVersion: ctx.iconVersion,
    title: '关于本站',
    description: `关于${site.title}：收录 ${total} 个网盘资源，介绍站点定位、使用方式与版权声明`,
    activeCat: '',
    categories,
    counts,
    total,
    body,
    baseUrl,
    canonicalPath: '/about/',
    footNavCurrent: '/about/',
    // 与首页 / 分类页 / 资源页同宽容器，卡片左右边线严格对齐
    wide: true,
    keywords: `关于${site.title},${site.title},网盘资源索引`,
  });
}

export function rssPage(ctx) {
  const { site, categories, counts, total, items, baseUrl } = ctx;
  const updated = lastmodOfList(items);
  const catFeeds = (categories || [])
    .map((c) =>
      feedRow(
        baseUrl,
        `/category/${encodeURIComponent(categorySlug(c))}/feed.xml`,
        `${c} RSS`,
        `${counts.get(c) || 0} 个资源`
      )
    )
    .join('\n');

  const body = `<nav class="crumb"><a href="/">首页</a><span>/</span><span>RSS 订阅</span></nav>
<h1 class="page__title">RSS 订阅</h1>
<div class="card-page">
  <p>本站所有新资源都会实时写入 RSS 源，用任意 RSS 阅读器订阅后，更新会自动推送到你面前，不必再来站点手动刷首页。</p>

  <h2>全站订阅（推荐）</h2>
  ${feedRow(baseUrl, '/feed.xml', '全站最新资源', `当前共 ${total} 个资源，最近 ${updated || '暂无更新'}`)}

  <h2>按分类订阅</h2>
  <p>只关心某一类，可以单独订阅该分类的源：</p>
${catFeeds}

  <h2>怎么订阅</h2>
  <ol>
    <li>复制上面的订阅地址。</li>
    <li>打开你的 RSS 阅读器（如 Feedly、Inoreader、Reeder、NetNewsWire、RSSHub Radder、堪称 · Follow 等）。</li>
    <li>选择「添加订阅源 / Add Feed」，粘贴地址即可。</li>
    <li>也可以直接点右侧「打开」按钮，浏览器会自动识别为源地址。</li>
  </ol>

  <h2>说明</h2>
  <ul>
    <li>源内含最新 ${Math.min(RSS_MAX, items.length)} 条资源，条目里带海报、简介与转存链接。</li>
    <li>每条资源的 <code>pubDate</code> 取入库日期，阅读器可按时间排序。</li>
    <li>本站是纯静态站，源随每次构建更新，通常每天都会刷新。</li>
  </ul>

  <p>更多关于本站的介绍见 <a href="/about/">关于本站</a>。</p>
</div>`;

  return layout({
    site,
    assetVersion: ctx.assetVersion,
    iconVersion: ctx.iconVersion,
    title: 'RSS 订阅',
    description: `${site.title} 的 RSS 订阅地址与使用方法，订阅后新资源实时推送`,
    activeCat: '',
    categories,
    counts,
    total,
    body,
    baseUrl,
    canonicalPath: '/rss/',
    footNavCurrent: '/rss/',
    // 与首页 / 分类页 / 资源页同宽容器，卡片左右边线严格对齐
    wide: true,
    keywords: `${site.title},RSS订阅,RSS feed,网盘资源`,
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

export function sitemapXml(baseUrl, resources, categories, extras = []) {
  // 首页 / 关于本站 / RSS 订阅 / 各分类页
  const line = (loc, lastmod, priority) =>
    `  <url><loc>${esc(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<priority>${priority}</priority></url>`;
  // lastmod 必须是页面真实变化日期：每次构建把全站刷成同一天，搜索引擎会判定为不可信并降低抓取频率
  const siteLastmod = lastmodOfList(resources);
  const urls = [
    line(baseUrl + '/', siteLastmod, '1.0'),
    ...extras.map((e) => line(`${baseUrl}${e.path}`, e.lastmod || siteLastmod, e.priority || '0.5')),
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
