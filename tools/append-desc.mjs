/**
 * 给已经补好的简介追加一句话，用于「还差几个字」这类收尾。
 *
 * 用法：
 *   node tools/append-desc.mjs            # 空跑
 *   node tools/append-desc.mjs --apply    # 写入
 *
 * 输入：.tmp/append-draft.json，形如 { "tv-059": "追加的一句话。" }
 * 行为：追加的文字排在结尾的「｜TMDB 7.5」这类来源后缀之前，
 *       其余字段不动，季数前缀和来源标记都保留。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadResources } from '../scripts/lib/data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apply = process.argv.includes('--apply');
const draftPath = path.join(root, '.tmp/append-draft.json');

if (!fs.existsSync(draftPath)) {
  console.error('找不到 .tmp/append-draft.json');
  process.exit(1);
}

const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));

/** 找出每个 id 属于哪个 YAML 文件，避免全目录翻找 */
const files = fs.readdirSync(path.join(root, 'data')).filter((f) => f.endsWith('.yaml'));
const idToFile = new Map();
for (const f of files) {
  const text = fs.readFileSync(path.join(root, `data/${f}`), 'utf8');
  for (const m of text.matchAll(/^\s*-\s+id:\s*(\S+)\s*$/gm)) idToFile.set(m[1], f);
}

const missing = [];
let changed = 0;

for (const [id, tail] of Object.entries(draft)) {
  const file = idToFile.get(id);
  if (!file) {
    missing.push(id);
    continue;
  }
  const full = path.join(root, `data/${file}`);
  let text = fs.readFileSync(full, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);

  let cur = null;
  let done = false;
  for (let i = 0; i < lines.length; i++) {
    const idHit = lines[i].match(/^\s*-\s+id:\s*(\S+)\s*$/);
    if (idHit) cur = idHit[1];
    if (cur !== id) continue;
    const m = lines[i].match(/^(\s*)description:\s*(.*)$/);
    if (!m) continue;

    const raw = m[2].trim();
    const inner = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
    const score = inner.match(/｜[^｜]{1,40}$/);
    const body = score ? inner.slice(0, -score[0].length) : inner;
    const next = `${body}${tail}${score ? score[0] : ''}`;
    const after = `${m[1]}description: ${JSON.stringify(next)}`;

    if (apply) lines[i] = after;
    console.log(`  ${id}　${[...inner].length} → ${[...next].length} 字`);
    changed++;
    done = true;
    break;
  }
  if (!done) missing.push(`${id}（没找到 description 行）`);
  if (apply) fs.writeFileSync(full, lines.join(eol));
}

if (missing.length) console.log(`\n! 未处理：${missing.join('、')}`);
console.log(`\n${apply ? `已追加 ${changed} 条` : `空跑：将追加 ${changed} 条（加 --apply 才写入）`}`);

if (apply) {
  try {
    const list = loadResources(path.join(root, 'data'));
    console.log(`回读校验：YAML 正常，载入 ${list.length} 条`);
  } catch (e) {
    console.log(`! 回读失败：${e.message}`);
  }
}
