#!/usr/bin/env node
// 批量入库：编号重命名 → 出链 → 海报 → 写 YAML。
//   node process-batch.mjs --init --scan ~/.workbuddy/quark-sync-cache/match.json [--skip 关键词]
//   node process-batch.mjs [--plan <plan.json>] [--size 20] [--sleep 1500]
// 只处理 plan 里 status=pending 的条目，完成后写回 plan（status/url/error）。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOME = process.env.HOME;
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
const { PROXY, REPO } = cfg;
const CLI = cfg.QUARK_CLI;
const MAKE = `${SKILL}/scripts/make-entry.mjs`;

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : d;
};
const PLAN = arg('plan', `${HOME}/.workbuddy/quark-sync-cache/plan.json`);
const SIZE = parseInt(arg('size', '20'), 10);
const SLEEP = parseInt(arg('sleep', '1500'), 10);

const run = (bin, args, opts = {}) =>
  new Promise((res, rej) =>
    execFile(bin, args, { maxBuffer: 64e6, ...opts }, (e, s, x) => (e ? rej(new Error(String(x || e.message).slice(0, 300))) : res(s)))
  );
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 初始化计划 ----------
if (process.argv.includes('--init')) {
  const scanPath = arg('scan', `${HOME}/.workbuddy/quark-sync-cache/match.json`);
  const only = arg('only', 'mv');
  const skip = (arg('skip', '') || '').split('|').filter(Boolean);
  const start = parseInt(arg('start', '12'), 10);

  const all = JSON.parse(fs.readFileSync(scanPath, 'utf8'));
  const list = all.filter(
    (r) => r.prefix === only && !r.likely_duplicate_of && !skip.some((s) => r.filename.includes(s))
  );

  const plan = list.map((r, i) => {
    const num = String(start + i).padStart(3, '0');
    const id = `${only}-${num}`;
    return {
      num,
      id,
      fid: r.fid,
      old_name: r.filename,
      new_name: `${num}-${r.filename}`,
      added: r.updated_at,
      match: r.match,
      status: 'pending',
      url: null,
      error: null,
    };
  });
  fs.mkdirSync(path.dirname(PLAN), { recursive: true });
  fs.writeFileSync(PLAN, JSON.stringify(plan, null, 1));
  console.log(`计划已生成：${plan.length} 条 → ${PLAN}`);
  console.log(`编号 ${only}-${String(start).padStart(3, '0')} ~ ${only}-${String(start + plan.length - 1).padStart(3, '0')}`);
  plan.slice(0, 5).forEach((p) => console.log(`  ${p.id}  ${p.old_name.slice(0, 60)}`));
  process.exit(0);
}

// ---------- 执行一批 ----------
const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
const batch = plan.filter((p) => p.status === 'pending').slice(0, SIZE);
if (!batch.length) {
  console.log('没有待处理条目了 ✓');
  process.exit(0);
}

console.log(`本批 ${batch.length} 条（${batch[0].id} ~ ${batch[batch.length - 1].id}）：`);
batch.forEach((p) => console.log(`  ${p.old_name}\n   → ${p.new_name}`));

// 1) 重命名
const itemsFile = `/tmp/batch-rename-${batch[0].num}.json`;
fs.writeFileSync(
  itemsFile,
  JSON.stringify(
    { schema_version: 1, items: batch.map((p) => ({ fid: p.fid, old_name: p.old_name, new_name: p.new_name })) },
    null,
    1
  )
);
try {
  const r = JSON.parse(await run('node', [CLI, 'rename', '--batch-id', crypto.randomBytes(8).toString('hex'), '--items-file', itemsFile]));
  console.log(`\n重命名：${r.data.result_status} ${r.data.success_count}/${r.data.total}`);
  if (r.data.fail_count) throw new Error(`重命名失败 ${r.data.fail_count} 条，已中止`);
} catch (e) {
  console.error('重命名失败，未改动网盘数据：', e.message);
  process.exit(1);
}

// 2) 出链（逐条，间隔降低风控）
for (const p of batch) {
  try {
    const s = JSON.parse(await run('node', [CLI, 'share', p.fid, '--title', p.new_name, '--url-type', '1', '--expired-type', '1']));
    p.url = s.data.share_url;
    console.log(`  ${p.id} → ${p.url}`);
  } catch (e) {
    p.error = `share失败: ${e.message.slice(0, 80)}`;
    console.log(`  ${p.id} ❌ ${p.error}`);
  }
  await sleep(SLEEP);
}

// 3) 海报
const imgDir = path.join(REPO, 'static/images');
await Promise.all(
  batch.map(async (p) => {
    if (!p.match?.poster_url) {
      p.poster = null;
      return;
    }
    const dest = path.join(imgDir, `${p.id}.jpg`);
    try {
      await run('curl', ['-s', ...(PROXY ? ['-x', PROXY] : []), '-o', dest, p.match.poster_url]);
      const size = fs.statSync(dest).size;
      if (size < 5000) throw new Error('文件过小');
      p.poster = `${p.id}.jpg`;
    } catch (e) {
      try {
        await run('curl', ['-s', ...(PROXY ? ['-x', PROXY] : []), '-o', dest, p.match.poster_url]);
        p.poster = fs.statSync(dest).size > 5000 ? `${p.id}.jpg` : null;
      } catch {
        p.poster = null;
      }
    }
  })
);
console.log(`\n海报：成功 ${batch.filter((p) => p.poster).length}/${batch.length}`);

// 4) 写 YAML
const fileMap = { mv: '电影.yaml', tv: '电视剧.yaml', dc: '纪录片.yaml' };
const dataFile = path.join(REPO, 'data', fileMap[batch[0].id.slice(0, 2)]);
const catMap = { mv: '电影', tv: '电视剧', dc: '纪录片' };
let block = '';
let written = 0;
for (const p of batch) {
  if (!p.url) continue;
  const m = p.match;
  const overview = (m?.overview || '').replace(/\s+/g, ' ').trim();
  // 完整简介（上限 300 字，TMDB 中文简介极少超此长度）；详情页正文不截断，列表卡片与 meta 由构建脚本自行截取
  const desc = (overview.length > 300 ? overview.slice(0, 300) + '…' : overview) + `｜TMDB ${Number(m?.vote || 0).toFixed(1)}`;
  const data = {
    id: p.id,
    title: m?.title || p.old_name.replace(/^\d+-/, ''),
    category: catMap[p.id.slice(0, 2)],
    tags: [catMap[p.id.slice(0, 2)], ...(m?.genres || []).slice(0, 3), ...(m ? [`${m.title} ${m.original}`] : [])],
    quark_url: p.url,
    description: desc,
    date: m?.date || p.added,
    added: p.added,
    image: p.poster || '',
  };
  if (!data.image) delete data.image;
  try {
    const y = await run('node', [MAKE, '--data', JSON.stringify(data)]);
    block += y.endsWith('\n') ? y : y + '\n';
    p.status = 'done';
    written++;
  } catch (e) {
    p.error = `YAML失败: ${e.message.slice(0, 120)}`;
    console.log(`  ${p.id} ❌ ${p.error}`);
  }
}
if (block) fs.appendFileSync(dataFile, block);
fs.writeFileSync(PLAN, JSON.stringify(plan, null, 1));

const left = plan.filter((p) => p.status === 'pending').length;
console.log(`\n已写入 ${written} 条 → ${dataFile}`);
console.log(`计划剩余 ${left} 条；下一批起始 ${left ? plan.find((p) => p.status === 'pending').id : '—'}`);
