#!/usr/bin/env node
// 生成一条资源 YAML 片段（输出到 stdout，供人工确认后追加到 data/<分类>.yaml）。
// 用法：node make-entry.mjs --data '<json>'
// JSON 字段：id,title,category,tags,quark_url,description,date,added,image
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = Object.fromEntries(
  fs
    .readFileSync(`${SKILL}/config.env`, 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const i = process.argv.indexOf('--data');
if (i < 0) throw new Error('用法：node make-entry.mjs --data \'<json>\'');
const d = JSON.parse(process.argv[i + 1]);

const REQUIRED = ['id', 'title', 'category', 'tags', 'quark_url', 'description', 'date', 'added', 'image'];
const miss = REQUIRED.filter((k) => d[k] === undefined || d[k] === '');
if (miss.length) throw new Error(`缺少字段：${miss.join(', ')}`);
// 分类目录 → id 前缀：04电影 mv / 03电视剧 tv / 06纪录片 dc / 05动漫 an / 01游戏 game / 02应用 app / 007其他 ot
const CATS = {
  电影: { prefix: 'mv', file: '电影.yaml' },
  电视剧: { prefix: 'tv', file: '电视剧.yaml' },
  纪录片: { prefix: 'dc', file: '纪录片.yaml' },
  动漫: { prefix: 'an', file: '动漫.yaml' },
  游戏: { prefix: 'game', file: '游戏.yaml' },
  软件: { prefix: 'app', file: '软件.yaml' },
  其他: { prefix: 'ot', file: '其他.yaml' },
};
const cat = CATS[d.category];
if (!cat) throw new Error(`category 只能是 ${Object.keys(CATS).join(' / ')}：${d.category}`);
if (!new RegExp(`^(${Object.values(CATS).map((c) => c.prefix).join('|')})-\\d{3}$`).test(d.id))
  throw new Error(`id 格式应为 <前缀>-001，前缀 ${Object.values(CATS).map((c) => c.prefix).join('/')}，当前：${d.id}`);
if (!d.id.startsWith(`${cat.prefix}-`))
  throw new Error(`id 前缀与分类不匹配：「${d.category}」应写作 ${cat.prefix}-xxx，当前：${d.id}`);
if (!Array.isArray(d.tags) || !d.tags.length) throw new Error('tags 必须是非空数组');
if (!/^https:\/\/pan\.quark\.cn\/s\/[a-z0-9]+$/.test(d.quark_url)) throw new Error(`quark_url 不合法：${d.quark_url}`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !/^\d{4}-\d{2}-\d{2}$/.test(d.added))
  throw new Error('date / added 必须是 YYYY-MM-DD');

const img = path.join(cfg.REPO, 'static/images', d.image);
if (!fs.existsSync(img)) console.error(`⚠ 海报不存在：${img}（先用 tmdb.mjs --poster 下载）`);

const q = (s) => `"${String(s).replace(/"/g, '\\"')}"`;
const tags = `[${d.tags.map(q).join(', ')}]`;

console.log(
  [
    '',
    `- id: ${d.id}`,
    `  title: ${q(d.title)}`,
    `  category: ${d.category}`,
    `  tags: ${tags}`,
    `  quark_url: ${q(d.quark_url)}`,
    `  description: ${q(d.description)}`,
    `  date: ${d.date}`,
    `  added: ${d.added}`,
    `  image: ${d.image}`,
    '',
  ].join('\n')
);
