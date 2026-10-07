#!/usr/bin/env node
// 从豆瓣图书抓取正版封面，供电子书（bk-）资源使用，替代 tools/book-poster.mjs 的生成式封面。
//
// 豆瓣没有开放 API，这里用图书搜索页内嵌的 JSON（含标题 / 作者 / 版本 / 封面地址），
// 再把封面地址的 /m/public/ 换成 /l/public/ 拿大图（约 500×750，正好是站点需要的 2:3）。
// 接口需要带浏览器 UA 与 book.douban.com 的 Referer，请求过快会被限流，脚本已内置重试。
//
// 用法：
//   node tools/book-cover-douban.mjs --title "牧羊少年奇幻之旅" --out static/images/bk-002.jpg
//   node tools/book-cover-douban.mjs --title "飞越疯人院" --author "肯·克西" --out static/images/bk-001.jpg
//   node tools/book-cover-douban.mjs --title "强风吹拂" --out static/images/bk-004.jpg --pick 26210487
//   node tools/book-cover-douban.mjs --title "肖申克的救赎" --list   # 只列候选，不下载
//
// 选项：
//   --title   书名（必填，用于搜索与精确匹配）
//   --out     输出路径（--list 时可省）
//   --author  作者关键字，用于在同一书名的多个版本里挑对应译本
//   --pick    直接指定豆瓣条目 id，跳过自动挑选
//   --list    只打印候选，不下载
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : d;
};
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const HEADERS = { 'User-Agent': UA, Referer: 'https://book.douban.com/' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 从 start 位置做括号配对，取出完整的 JSON 数组文本 */
function sliceArray(text, start) {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

async function searchBooks(q, attempt = 1) {
  const url = `https://book.douban.com/subject_search?search_text=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const html = await r.text();
  const at = html.indexOf('"items": [');
  if (at < 0) {
    if (attempt < 3) {
      await sleep(3000);
      return searchBooks(q, attempt + 1);
    }
    return [];
  }
  const arrText = sliceArray(html, html.indexOf('[', at));
  if (!arrText) return [];
  return (JSON.parse(arrText) || []).filter((x) => x && x.title && x.cover_url);
}

async function main() {
  const title = arg('title');
  const out = arg('out');
  const author = arg('author');
  const pick = arg('pick');
  const listOnly = process.argv.includes('--list');
  if (!title || (!out && !listOnly)) {
    console.error(
      '用法：node tools/book-cover-douban.mjs --title "书名" --out static/images/bk-001.jpg [--author 关键字] [--pick 豆瓣id] [--list]'
    );
    return 1;
  }

  const items = await searchBooks(title);
  const key = title.replace(/\s/g, '');
  const exact = items.filter((x) => String(x.title).replace(/\s/g, '') === key);
  const candidates = exact.length ? exact : items;

  if (!candidates.length) {
    console.error(`✗ 豆瓣未找到《${title}》（可能是已下架书目，改用 tools/book-poster.mjs 生成封面）`);
    return 2;
  }

  console.log(`《${title}》候选 ${candidates.length} 条：`);
  candidates.slice(0, 8).forEach((x) => console.log(`  ${x.id}  ${String(x.abstract || '').slice(0, 70)}`));

  let target = null;
  if (pick) target = candidates.find((x) => String(x.id) === String(pick)) || items.find((x) => String(x.id) === String(pick));
  else if (author) target = candidates.find((x) => String(x.abstract || '').includes(author));
  target = target || candidates[0];

  if (!target) {
    console.error(`✗ 指定的条目 id ${pick} 不在结果中`);
    return 3;
  }
  if (listOnly) {
    console.log(`\n（--list 模式，未下载）首选：${target.id} ${String(target.abstract).slice(0, 60)}`);
    return 0;
  }

  const big = String(target.cover_url).replace('/m/public/', '/l/public/');
  const r = await fetch(big, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error('封面下载失败 HTTP ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 8000) throw new Error(`封面文件过小（${buf.length}B），可能被限流或该条目无图`);

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  console.log(`\n✓ 已写入 ${out}（${(buf.length / 1024).toFixed(0)}KB，豆瓣条目 ${target.id}）`);
  console.log(`  ${String(target.abstract).slice(0, 80)}`);
  console.log('  提示：入库前看一眼实际画面，豆瓣上有条目的封面是「封面+封底」展开图，那种要换别的版本。');
  return 0;
}

try {
  process.exitCode = await main();
} catch (e) {
  console.error('✗ ' + e.message);
  process.exitCode = 1;
}
