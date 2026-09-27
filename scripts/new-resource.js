import fs from 'node:fs';
import readline from 'node:readline/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q, def = '') => rl.question(`${q}${def ? `（默认 ${def}）` : ''}：`);

const get = async (q, def = '') => (await ask(q, def)).trim() || def;

console.log('新增资源（直接回车留空即可）\n');
const title = await get('标题');
if (!title) {
  console.log('标题不能为空');
  rl.close();
  process.exit(1);
}

const category = await get('分类', '影视');
// 按分类落到对应数据文件：data/<分类>.yaml，不存在则创建
const file = path.join(root, 'data', `${category.replace(/[\\/]/g, '-')}.yaml`);
const tags = await get('标签（逗号分隔）');
const quark = await get('夸克链接');
const baidu = await get('百度链接');
const code = baidu ? await get('百度提取码') : '';
const description = await get('一句话介绍');
const date = await get('日期', new Date().toISOString().slice(0, 10));
const id = await get('ID（对应配图文件名，留空自动生成）');

const entry = [`- title: "${title.replace(/"/g, '\\"')}"`];
if (id) entry.push(`  id: ${id}`);
entry.push(`  category: "${category}"`);
if (tags) entry.push(`  tags: [${tags.split(/[,，]/).map((t) => t.trim()).join(', ')}]`);
if (quark) entry.push(`  quark_url: "${quark}"`);
if (baidu) entry.push(`  baidu_url: "${baidu}"`);
if (code) entry.push(`  baidu_code: "${code}"`);
if (description) entry.push(`  description: "${description.replace(/"/g, '\\"')}"`);
entry.push(`  date: ${date}`);

if (!fs.existsSync(file)) fs.writeFileSync(file, `# ${category} 资源\n`);
fs.appendFileSync(file, `\n${entry.join('\n')}\n`);
console.log(`\n已写入 ${path.relative(root, file)}，运行 npm run build 生成页面`);
rl.close();
