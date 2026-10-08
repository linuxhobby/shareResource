/**
 * 把草稿里的简介写回 YAML（第三项 SEO 待办：补厚过短简介）。
 *
 * 用法：
 *   node tools/fill-desc.mjs            # 空跑，只打印将要改成什么
 *   node tools/fill-desc.mjs --apply    # 真正写入 data/*.yaml
 *
 * 输入：.tmp/desc-draft.json，形如 { "mv-212": "新简介正文", ... }
 * 行为：
 *   1. 保留原简介里的「｜TMDB x.x」评分后缀，写在新正文之后；
 *   2. 按 `- id: xxx` 定位条目块，只改该块的 description 一行，其余内容一字不动；
 *   3. 以 JSON 双引号标量写回，中文、引号、换行都不会破坏 YAML 结构。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadResources } from '../scripts/lib/data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apply = process.argv.includes('--apply');
const draftPath = path.join(root, '.tmp/desc-draft.json');

if (!fs.existsSync(draftPath)) {
  console.error('找不到 .tmp/desc-draft.json');
  process.exit(1);
}

const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));

/** 找出每个 id 属于哪个 YAML 文件，避免全目录 grep */
const files = fs.readdirSync(path.join(root, 'data')).filter((f) => f.endsWith('.yaml'));
const idToFile = new Map();
for (const f of files) {
  const text = fs.readFileSync(path.join(root, `data/${f}`), 'utf8');
  for (const m of text.matchAll(/^\s*-\s+id:\s*(\S+)\s*$/gm)) idToFile.set(m[1], f);
}

const missing = [];
let changed = 0;
const touched = new Map();

for (const [id, body] of Object.entries(draft)) {
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
    /** 先剥掉 YAML 双引号标量的外层引号，才看得到末尾的评分后缀 */
    const inner = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
    const score = inner.match(/｜\s*TMDB\s*[\d.]+\s*$/);
    const next = score && !body.includes('TMDB') ? `${body}｜${score[0].replace(/^｜\s*/, '')}` : body;
    const after = `${m[1]}description: ${JSON.stringify(next)}`;

    if (after === lines[i]) {
      done = true;
      break;
    }
    if (apply) lines[i] = after;
    touched.set(file, (touched.get(file) || []).concat({ id, before: inner, after: next }));
    changed++;
    done = true;
    break;
  }
  if (!done) missing.push(`${id}（没找到 description 行）`);
  if (apply) fs.writeFileSync(full, lines.join(eol));
}

// 报告
for (const [file, list] of touched) {
  console.log(`\n== data/${file}（${list.length} 条）`);
  for (const { id, before, after } of list) {
    console.log(`\n  ${id}`);
    console.log(`  - ${before.slice(0, 60)}`);
    console.log(`  + ${after.slice(0, 60)}…（${[...after].length} 字）`);
  }
}

if (missing.length) console.log(`\n! 未处理：${missing.join('、')}`);
console.log(`\n${apply ? `已写入 ${changed} 条` : `空跑：将修改 ${changed} 条（加 --apply 才写入）`}`);

if (apply) {
  // 回读一遍：YAML 一旦被写坏，这里会直接抛出来
  try {
    const list = loadResources(path.join(root, 'data'));
    const still = list.filter((it) => [...String(it.description || '').trim()].length < 60);
    console.log(`回读校验：YAML 正常，载入 ${list.length} 条，其中仍不足 60 字的有 ${still.length} 条`);
  } catch (e) {
    console.log(`! 回读失败，请检查 data/*.yaml：${e.message}`);
  }
}
