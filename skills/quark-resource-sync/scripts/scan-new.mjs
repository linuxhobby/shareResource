#!/usr/bin/env node
// 扫描夸克网盘 SHARE 下各分类目录，找出"未编号"的新增目录，并给出下一可用编号。
// 输出：人类可读摘要 + JSON（写入 --out 或 /tmp/scan-new.json）
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadCfg() {
  const raw = fs.readFileSync(`${SKILL}/config.env`, 'utf8').split('\n');
  return Object.fromEntries(
    raw
      .filter((l) => l.trim() && !l.trim().startsWith('#'))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
      })
  );
}
const cfg = loadCfg();
const CLI = cfg.QUARK_CLI;

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : d;
};
const SHARE_FID = arg('share-fid', cfg.SHARE_FID);
const OUT = arg('out', '/tmp/scan-new.json');

const run = (args) =>
  new Promise((res, rej) =>
    execFile('node', [CLI, ...args], { maxBuffer: 64e6 }, (e, s) => (e ? rej(e) : res(s)))
  );

// browse 把条目写到 jsonl，返回解析后的数组
async function browse(fid) {
  const out = await run(['browse', '--all', '--page-size', '100', '--parent-fid', fid]);
  const m = out.match(/\/Users[^"]*\.jsonl/);
  if (!m) throw new Error(`browse 未返回 jsonl：${out.slice(0, 200)}`);
  return fs
    .readFileSync(m[0], 'utf8')
    .trim()
    .split('\n')
    .map(JSON.parse);
}

// SHARE 下的分类目录 → 站点分类、id 前缀、数据文件（覆盖全部 6 个分类，游戏/软件同样编号）
const CATS = [
  { dir: '04电影', key: '电影', prefix: 'mv', file: '电影.yaml' },
  { dir: '03电视剧', key: '电视剧', prefix: 'tv', file: '电视剧.yaml' },
  { dir: '06纪录片', key: '纪录片', prefix: 'dc', file: '纪录片.yaml' },
  { dir: '05动漫', key: '动漫', prefix: 'an', file: '动漫.yaml' },
  { dir: '01游戏', key: '游戏', prefix: 'game', file: '游戏.yaml' },
  { dir: '02应用', key: '软件', prefix: 'app', file: '软件.yaml' },
];

// 不参与同步的目录：转存待清理，不编号、不出链、不入站
const EXCLUDE_DIRS = ['99-待删除'];

// 目录名匹配：先用完整目录名，再用「去掉前导数字」后的名字（网盘目录改名也能对上）
const stripNum = (s) => String(s).replace(/^\d+\s*/, '');
const sameName = (a, b) => a === b || norm(a) === norm(b);
const matchCat = (name) =>
  CATS.find((c) => c.dir === name) || CATS.find((c) => sameName(stripNum(name), c.key));

// 归一化：去编号前缀、括号内容、分隔符，用于重复比对
const norm = (s) =>
  String(s)
    .replace(/^\d+\s*[-.]/, '')
    .replace(/[\[\(【].*?[\]\)】]/g, '')
    .replace(/[\s·・:：\-_.]/g, '')
    .toLowerCase();

const dirs = (await browse(SHARE_FID)).filter((o) => String(o.file_type) === '0');
const result = {
  scanned_at: new Date().toISOString(),
  share_fid: SHARE_FID,
  excluded: [],
  categories: [],
};

// 遍历 SHARE 下所有目录（「99-待删除」等排除项跳过）
for (const dir of dirs) {
  if (EXCLUDE_DIRS.some((x) => sameName(dir.filename, x))) {
    result.excluded.push({ dir: dir.filename, fid: dir.fid });
    continue;
  }
  const c = matchCat(dir.filename) || { key: dir.filename, prefix: null, file: null, unmapped: true };
  const all = await browse(dir.fid);
  const items = all.filter((o) => String(o.file_type) === '0'); // 资源一律是目录，散落文件单独计数
  const numbered = items.filter((o) => /^\d+\s*[-.]/.test(o.filename));
  const unnumbered = items.filter((o) => !/^\d+\s*[-.]/.test(o.filename));

  const maxNum = numbered.reduce((m, o) => {
    const n = parseInt(o.filename.match(/^(\d+)\s*[-.]/)?.[1] || '0', 10);
    return Math.max(m, n);
  }, 0);

  const list = unnumbered.map((o) => {
    const kp = norm(o.filename);
    const hit = numbered.find((n) => {
      const kn = norm(n.filename);
      return kn === kp || kn.includes(kp) || (kp.length >= 3 && kp.includes(kn));
    });
    return {
      filename: o.filename,
      fid: o.fid,
      updated_at: o.updated_at ? new Date(o.updated_at).toISOString().slice(0, 10) : null,
      likely_duplicate_of: hit ? hit.filename : null,
    };
  });

  result.categories.push({
    ...c,
    dir: dir.filename,
    dir_fid: dir.fid,
    total: items.length,
    numbered: numbered.length,
    loose_files: all.length - items.length,
    next_number: String(maxNum + 1).padStart(3, '0'),
    unnumbered: list,
  });
}

fs.writeFileSync(OUT, JSON.stringify(result, null, 1));

let todo = 0;
for (const c of result.categories) {
  const head = c.unmapped
    ? `【${c.dir}】⚠ SHARE 下有此目录，但站点无对应分类（只列出，不入库）`
    : `【${c.dir}】共 ${c.total} 项（已编号 ${c.numbered}）→ 下一编号 ${c.prefix}-${c.next_number}`;
  console.log(head + (c.loose_files ? `  （另有 ${c.loose_files} 个散落文件，未计入）` : ''));
  if (!c.unnumbered.length) {
    console.log('  无未编号目录 ✓');
  } else {
    for (const u of c.unnumbered) {
      todo++;
      console.log(`  · ${u.filename}  (${u.updated_at})`);
      if (u.likely_duplicate_of) console.log(`      ⚠ 疑似重复于 → ${u.likely_duplicate_of}`);
    }
  }
}
if (result.excluded.length)
  console.log(`\n已跳过：${result.excluded.map((e) => e.dir).join(' / ')}（不扫描、不入库）`);
console.log(`\nJSON 已写入 ${OUT}；待处理未编号目录 ${todo} 个`);
