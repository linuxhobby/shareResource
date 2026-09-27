import { categorySlug } from './data.js';

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

function catNav(site, categories, counts, activeCat, total) {
  const items = [
    `<a class="cat${activeCat ? '' : ' is-on'}" href="/">全部<span class="cat__n">${total}</span></a>`,
    ...categories.map(
      (c) =>
        `<a class="cat${c === activeCat ? ' is-on' : ''}" href="${catHref(c)}">${esc(c)}<span class="cat__n">${counts.get(c) || 0}</span></a>`
    ),
  ];
  return `<nav class="cats" aria-label="分类">${items.join('')}</nav>`;
}

function layout({ site, title, description, activeCat, categories, counts, total, body, head = '' }) {
  const fullTitle = title === site.title ? site.title : `${title} - ${site.title}`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || site.description)}">
<meta name="theme-color" content="#4B3FE3">
<link rel="stylesheet" href="/assets/style.css">
${head}
</head>
<body>
<header class="top">
  <div class="wrap top__inner">
    <a class="top__brand" href="/">${esc(site.title)}</a>
    <form class="top__search" role="search" onsubmit="return false">
      <input id="q" type="search" placeholder="搜索资源…" autocomplete="off" aria-label="搜索资源">
    </form>
  </div>
</header>
${catNav(site, categories, counts, activeCat, total)}
<main class="wrap">
${body}
</main>
<footer class="foot wrap">
  <p>共 ${total} 个资源 · ${esc(site.disclaimer)}</p>
  ${site.icp ? `<p class="foot__icp">${esc(site.icp)}</p>` : ''}
</footer>
<script src="/assets/app.js" defer></script>
</body>
</html>
`;
}

export function rowHtml(item, images) {
  const img = images.get(item.id) || {};
  return `<a class="row" href="/resource/${encodeURIComponent(item.id)}/">
  <img class="row__thumb" src="${esc(img.thumb)}" width="60" height="90" alt="" loading="lazy" decoding="async">
  <span class="tag tag--cat">${esc(item.category)}</span>
  <span class="row__title">${esc(item.title)}</span>
  <span class="row__arrow" aria-hidden="true">→</span>
</a>`;
}

export function listPage(ctx) {
  const { site, items, categories, counts, activeCat, total, pageSize, images } = ctx;
  const first = items.slice(0, pageSize);
  const indexData = items.map((it) => ({
    id: it.id,
    title: it.title,
    category: it.category,
    tags: it.tags,
    desc: it.description.slice(0, 40),
    href: `/resource/${encodeURIComponent(it.id)}/`,
    thumb: (images.get(it.id) || {}).thumb || '/img/placeholder.svg',
  }));

  const heading = activeCat
    ? `<h1 class="page__title">${esc(activeCat)}<span class="page__n">${items.length} 个资源</span></h1>`
    : `<h1 class="page__title">全部资源<span class="page__n">${total} 个资源</span></h1>`;

  const body = `${heading}
<div id="results" class="results" hidden></div>
<div id="list" class="list">
${first.map((it) => rowHtml(it, images)).join('\n')}
</div>
${
  items.length > pageSize
    ? `<button id="more" class="btn btn--more" type="button">加载更多（剩余 ${items.length - pageSize}）</button>`
    : ''
}
${items.length === 0 ? '<p class="empty">该分类下暂无资源</p>' : ''}
<script type="application/json" id="list-data">${JSON.stringify(indexData).replace(/</g, '\\u003c')}</script>`;

  return layout({
    site,
    title: activeCat ? `${activeCat} - ${site.title}` : site.title,
    description: activeCat ? `${activeCat}资源合集` : site.description,
    activeCat,
    categories,
    counts,
    total,
    body,
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
  const { site, item, categories, counts, total, images, qrLinks } = ctx;
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
    <img class="poster" src="${esc(img.detail)}" width="180" height="260" alt="${esc(item.title)}" loading="lazy" decoding="async">
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

  return layout({
    site,
    title: item.title,
    description: `${item.category} · ${item.description.slice(0, 100)}`,
    activeCat: item.category,
    categories,
    counts,
    total,
    body,
    head: `<link rel="canonical" href="/resource/${encodeURIComponent(item.id)}/">`,
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
  });
}

export function sitemapXml(baseUrl, resources, categories) {
  const urls = [
    baseUrl + '/',
    ...categories.map((c) => `${baseUrl}/category/${encodeURIComponent(categorySlug(c))}/`),
    ...resources.map((r) => `${baseUrl}/resource/${encodeURIComponent(r.id)}/`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`;
}
