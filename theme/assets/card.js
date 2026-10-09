/**
 * 卡片模板 —— 构建端与浏览器端共用的唯一一份。
 *
 * 为什么单拆一个文件：同一张宫格卡片要渲染两次——
 *   1. 构建期（scripts/lib/render.js）刷进首屏 HTML，不执行 JS 也能看到；
 *   2. 浏览器里（app.js）渲染「加载更多」和搜索结果。
 * 两边各抄一份的话，改结构必然漏改一边，出现「首屏和点加载更多长得不一样」。
 *
 * 这里只做字符串拼接，不碰 DOM、不碰 Node API，所以两端都能直接 import。
 */

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 单张宫格卡片。
 *
 * @param {object}   o
 * @param {string}   o.href       详情页链接
 * @param {string}   o.src        海报地址
 * @param {string}   o.title      资源名（用于 alt，会转义）
 * @param {string}  [o.titleHtml] 已处理好的标题 HTML（搜索结果用它塞 <mark> 高亮），不传则转义 title
 * @param {string}   o.category   分类
 * @param {string}  [o.date]      日期，空则不显示
 * @param {boolean} [o.isNew]     是否打「最新」角标
 * @param {boolean} [o.eager]     首屏图：eager + fetchpriority，抢 LCP
 */
export function tileHtml({
  href,
  src,
  title,
  titleHtml = '',
  category,
  date = '',
  isNew = false,
  eager = false,
}) {
  const loading = eager ? 'eager" fetchpriority="high' : 'lazy';
  return `<li class="tile-item">
  <a class="tile" href="${esc(href)}">
    <span class="tile__poster">
      <img class="tile__img" src="${esc(src)}" width="240" height="360" alt="${esc(title)}" loading="${loading}" decoding="async">
      ${isNew ? '<span class="tile__new">最新</span>' : ''}
    </span>
    <span class="tile__title">${titleHtml || esc(title)}</span>
    <span class="tile__meta">${esc(category)}${date ? ` · ${esc(date)}` : ''}</span>
  </a>
</li>`;
}
