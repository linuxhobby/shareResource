import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const NETDISK_PRESETS = [
  { key: 'quark_url', code: 'quark_code', kind: 'quark', name: '夸克网盘' },
  { key: 'baidu_url', code: 'baidu_code', kind: 'baidu', name: '百度网盘' },
  { key: 'aliyun_url', code: 'aliyun_code', kind: 'aliyun', name: '阿里云盘' },
  { key: 'tianyi_url', code: 'tianyi_code', kind: 'tianyi', name: '天翼云盘' },
  { key: 'uc_url', code: 'uc_code', kind: 'uc', name: 'UC网盘' },
  { key: 'xunlei_url', code: 'xunlei_code', kind: 'xunlei', name: '迅雷网盘' },
  { key: '115_url', code: '115_code', kind: '115', name: '115网盘' },
  { key: 'mobile_url', code: 'mobile_code', kind: 'mobile', name: '移动云盘' },
];

export function hashId(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 'r' + (h >>> 0).toString(36);
}

/** 英文/数字标题转 slug；中文标题返回空串，由调用方回退到 hashId */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function categorySlug(name) {
  return String(name).trim().replace(/[\\/]+/g, '-');
}

export function formatDate(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function toTags(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : String(value).split(/[,，、\s]+/);
  return list.map((t) => String(t).trim()).filter(Boolean);
}

/** 读取 data/ 目录下所有 .yaml / .yml 资源文件（site.yaml 除外），合并为一个数组 */
export function loadResources(dataDir) {
  if (!fs.existsSync(dataDir)) return [];
  const files = fs
    .readdirSync(dataDir)
    .filter((f) => /\.ya?ml$/i.test(f) && f !== 'site.yaml')
    .sort();

  const all = [];
  for (const file of files) {
    const parsed = yaml.load(fs.readFileSync(path.join(dataDir, file), 'utf8'));
    if (!parsed) continue;
    const list = Array.isArray(parsed) ? parsed : parsed.resources || [];
    for (const raw of list) all.push({ ...raw, __file: file });
  }
  return all;
}

/**
 * 把 data/*.yaml 头部注释里的条数刷新为实际条数，避免手工维护时数字漂移。
 * 例：「# 电影资源（10 条）」→「# 电影资源（239 条）」；头部没有条数标记但含「资源」二字时自动补上。
 * 只有数字确实变化时才会写回文件。返回被修改的文件说明列表。
 */
export function syncHeaderCounts(dataDir) {
  if (!fs.existsSync(dataDir)) return [];
  const changed = [];
  const files = fs
    .readdirSync(dataDir)
    .filter((f) => /\.ya?ml$/i.test(f) && f !== 'site.yaml')
    .sort();

  for (const file of files) {
    const full = path.join(dataDir, file);
    const text = fs.readFileSync(full, 'utf8');
    const headMatch = text.match(/^((?:#[^\n]*\n)+)/);
    if (!headMatch) continue; // 没有头部注释的文件不处理

    const parsed = yaml.load(text);
    const n = (Array.isArray(parsed) ? parsed : parsed?.resources || []).length;
    const head = headMatch[1];
    let next;
    if (/^#[^\n]*?（\d+ 条）/m.test(head)) {
      next = head.replace(/^(#[^\n]*?)（\d+ 条）/m, `$1（${n} 条）`);
    } else if (/^#[^\n]*资源/m.test(head)) {
      next = head.replace(/^(#[^\n]*资源)/m, `$1（${n} 条）`);
    } else {
      continue;
    }
    if (next === head) continue;

    fs.writeFileSync(full, next + text.slice(head.length));
    changed.push(`${file} → ${n} 条`);
  }
  return changed;
}

export function loadSite(dataDir) {
  const file = path.join(dataDir, 'site.yaml');
  const cfg = fs.existsSync(file) ? yaml.load(fs.readFileSync(file, 'utf8')) || {} : {};
  return {
    title: cfg.title || '网盘资源站',
    description: cfg.description || '',
    disclaimer: cfg.disclaimer || '',
    categories: Array.isArray(cfg.categories) ? cfg.categories.map(String) : [],
    icp: cfg.icp || '',
    pageSize: Number(cfg.pageSize) > 0 ? Number(cfg.pageSize) : 60,
  };
}

/** 把原始数据规整成标准结构，生成 id / 链接列表 / 时间等 */
export function normalizeResources(rawList) {
  const used = new Map();
  const items = [];

  rawList.forEach((raw, index) => {
    const title = String(raw.title || '').trim();
    if (!title) return;

    let id = String(raw.id || slugify(title) || hashId(title || String(index))).trim();
    if (used.has(id)) {
      const n = used.get(id) + 1;
      used.set(id, n);
      id = `${id}-${n}`;
    } else {
      used.set(id, 1);
    }

    const links = [];
    for (const preset of NETDISK_PRESETS) {
      const url = raw[preset.key];
      if (!url) continue;
      links.push({
        kind: preset.kind,
        name: raw[`${preset.kind}_name`] || preset.name,
        url: String(url).trim(),
        code: raw[preset.code] ? String(raw[preset.code]).trim() : '',
      });
    }
    if (Array.isArray(raw.links)) {
      for (const l of raw.links) {
        if (!l || !l.url) continue;
        links.push({
          kind: l.kind || 'other',
          name: l.name || '网盘链接',
          url: String(l.url).trim(),
          code: l.code ? String(l.code).trim() : '',
        });
      }
    }

    const date = formatDate(raw.date || raw.updated || '');
    const added = formatDate(raw.added || raw.added_at || raw.created || '');
    items.push({
      id,
      title,
      category: String(raw.category || '未分类').trim(),
      tags: toTags(raw.tags),
      description: String(raw.description || raw.desc || '').trim(),
      image: raw.image ? String(raw.image) : '',
      date,
      added,
      links,
      primary: links[0] || null,
      // 未填 added 视为最新，排在最前
      sortKey: added || '9999-12-31',
      order: index,
    });
  });

  /** 取 id 末尾的编号，用于同日加入时按加入顺序（编号大者在后）排序 */
  function idNum(id) {
    const m = String(id).match(/(\d+)$/);
    return m ? Number(m[1]) : -1;
  }

  // 新增时间倒序 → 同日按编号倒序 → 上映日期倒序 → 文件内原序
  items.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey < b.sortKey ? 1 : -1;
    const na = idNum(a.id);
    const nb = idNum(b.id);
    if (na !== nb) return nb - na;
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.order - b.order;
  });

  const counts = new Map();
  for (const it of items) counts.set(it.category, (counts.get(it.category) || 0) + 1);
  const siteCats = new Set();
  return { items, counts };
}

/** 分类顺序：site.yaml 指定的优先，其余按资源数量倒序追加 */
export function orderCategories(site, counts) {
  const ordered = [];
  const seen = new Set();
  for (const c of site.categories) {
    if (counts.has(c) && !seen.has(c)) {
      ordered.push(c);
      seen.add(c);
    }
  }
  const rest = [...counts.entries()]
    .filter(([c]) => !seen.has(c))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
  for (const [c] of rest) ordered.push(c);
  return ordered;
}
