/**
 * 列出简介过短的资源，方便逐条补写。
 *
 * Bing / Google 对「模板重 + 正文稀」的聚合页容忍度很低，
 * 589 条里有 236 条简介不足 120 字，这些页面最容易被判为 thin content。
 * 本脚本按字数升序输出清单，优先处理的就是排在最前面的那些。
 *
 * 用法：
 *   npm run list:short                 # 列出不足 120 字的全部条目
 *   npm run list:short -- --max=80     # 只看不足 80 字的
 *   npm run list:short -- --limit=30   # 只列最前的 30 条
 *   npm run list:short -- --cat=软件    # 只看某个分类
 *
 * 结果同时写入 .tmp/short-desc.md（已 gitignore），可以直接对着它改 YAML。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadResources, normalizeResources } from '../scripts/lib/data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
/** 取一个 --key=value 形式的参数，取不到用默认值 */
const arg = (key, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${key}=`));
  return hit ? hit.slice(key.length + 3) : fallback;
};

const max = Number(arg('max', 120));
const limit = Number(arg('limit', 0)) || Infinity;
const cat = arg('cat', '');

const { items } = normalizeResources(loadResources(path.join(root, 'data')));
const len = (s) => [...String(s || '').trim()].length;

const short = items
  .filter((it) => (!cat || it.category === cat) && len(it.description) < max)
  .sort((a, b) => len(a.description) - len(b.description))
  .slice(0, limit);

if (!short.length) {
  console.log(`没有简介少于 ${max} 字的条目${cat ? `（分类：${cat}）` : ''}`);
  process.exit(0);
}

const lines = short.map(
  (it) =>
    `| ${len(it.description)} | ${it.id} | ${it.category} | ${it.title} | ${String(it.description || '')
      .replace(/\s+/g, ' ')
      .slice(0, 40)}… |`
);

const md = [
  `# 简介少于 ${max} 字的资源（${short.length} 条）`,
  '',
  `> 生成时间：${new Date().toISOString().slice(0, 10)}　按字数升序，排在最前面的最该先补。`,
  '',
  '| 字数 | id | 分类 | 标题 | 当前简介 |',
  '|---:|---|---|---|---|',
  ...lines,
  '',
].join('\n');

fs.mkdirSync(path.join(root, '.tmp'), { recursive: true });
fs.writeFileSync(path.join(root, '.tmp/short-desc.md'), md);

console.log(md);
console.log(`已写入 .tmp/short-desc.md（${short.length} 条，共 ${items.length} 条资源）`);
