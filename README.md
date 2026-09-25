# 星球资源 PlanetResource

综合型网盘资源导航站。收录电影、电视剧、纪录片、动漫、软件、办公模板、电子书、学习课程、设计素材、AI 资源等，统一检索、分类导航，一键跳转夸克 / 百度网盘转存。

**本站只做索引**：不存储、不托管、不提供下载任何文件，页面展示的只是资源信息 + 第三方网盘分享链接。

完整规划见 [PROJECT_PLAN.md](PROJECT_PLAN.md)，本 README 是其对外摘要；当前代码库为 **Phase 0（纯静态版）**，目标形态是下述动态站。

## 产品形态

```
用户 ──→ 搜索 / 分类 / 推荐 ──→ 资源数据库 ──→ 夸克 · 百度 · 其他网盘
                                        │
                              AI 自动整理 + Hermes Agent
                                        │
                                   半自动运营
```

- **前台**：搜索框为视觉中心的首页、分类页、带筛选与排序的搜索结果页、信息完整的资源详情页（封面、简介、版本、清晰度、更新时间、多网盘入口）、移动端单列适配
- **后台**：资源 / 分类 / 标签 / 链接管理、投稿审核、Dashboard（资源量、访问量、失效链接、待审核）、CSV / JSON / Excel 批量导入
- **自动化**：网盘链接定时检测（🟢 正常 / 🟡 未知 / 🔴 失效）、AI 自动分类与生成简介、标题相似度去重、Hermes Agent 通过专用 API 提交资源进入待审核队列
- **增长**：热门搜索榜单、统计（PV / UV、网盘点击量）、详情页相关推荐、用户收藏 / 评论 / 举报、RSS、Telegram Bot

## 分类体系

| 一级分类 | 说明 |
| --- | --- |
| 影视 | 电影 / 电视剧 / 纪录片 / 动漫 / 综艺 / 4K · 蓝光 |
| 软件 | Windows / macOS / Linux / Android / iOS，按用途细分 |
| 办公 | Word / Excel / PPT / PDF 模板、简历、合同、字体、素材 |
| 学习 | 编程 / AI / 外语 / 考试 / 职业技能 |
| 电子书 | 小说 / 技术 / 人文 / 社科 / 有声书 |
| 素材 | 图片 / 视频 / 音乐 / PSD / 设计素材 |
| AI | AI 软件 / 教程 / Prompt / 模型 |
| 工具 | 在线工具 / 开源项目 / 网站导航 |

分类支持无限级（影视 → 电视剧 → 美剧），标签体系（4K / 中文字幕 / Netflix / 科幻……）与分类正交，共同支撑搜索与筛选。

## 技术架构

| 层 | 选型 |
| --- | --- |
| 前端 / 后端 | Next.js（App Router + API Routes） |
| 数据库 | PostgreSQL（含全文检索），Prisma ORM |
| 部署 | Caddy + Docker Compose（Debian 13） |
| 认证 / 安全 | Auth.js，RBAC，管理员 2FA，Rate Limit |
| AI / 自动化 | OpenAI-compatible API、定时链接检测 Worker、Hermes Agent |

核心数据模型：`resources` / `categories` / `tags` / `resource_links` / `submissions` / `link_checks`（建表 SQL 见 PROJECT_PLAN §4）。

API：公开读 `/api/v1/resources|search|categories`，管理 `/api/v1/admin/*`，Agent 专用 `/api/v1/agent/*`（Bearer Token，提交后进待审核，不直接发布）。

## 路线图

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| Phase 0 | 纯静态版：单页索引 + 二维码 + 前端搜索筛选 | ✅ 当前代码库 |
| Phase 1–4 | Next.js + PostgreSQL 框架 → 资源系统 → 前台 → 后台 | ⬜ 规划中 |
| Phase 5 | SEO：Metadata / Sitemap / RSS / JSON-LD | ⬜ 规划中 |
| Phase 6–7 | 链接自动检测、用户投稿与审核 | ⬜ 规划中 |
| Phase 8–9 | AI 整理 / 去重、Hermes Agent 对接 | ⬜ 规划中 |

## 当前版本（Phase 0）快速上手

当前代码库是规划落地前的过渡形态：零后端、零数据库、零外网依赖，数据维护在 `data/resources.js`。

```bash
python3 -m http.server 8765   # 或直接双击 index.html
# 浏览器打开 http://127.0.0.1:8765
```

**添加资源**：编辑 `data/resources.js`，向 `window.RESOURCES` 追加一个对象：

```js
{
  id: 'unique-id',       // 唯一标识，深链锚点 #unique-id 用它
  title: '资源标题',
  desc: '一句话描述',
  category: '设计素材',   // 自由填写，自动生成分类筛选项
  pan: 'quark',          // 对应 window.PAN_MAP 中的网盘标识
  url: 'https://pan.quark.cn/s/xxxx',
  code: 'abcd',          // 提取码，无则留空字符串
  size: '3.2 GB',
  tags: ['字体', '开源'],
  date: '2026-09-18',    // 影响默认排序
  top: true,             // 可选，置顶
  qrImage: 'qr/x.png'    // 可选，已有二维码图则不再自动生成
}
```

**站点文案**：同文件的 `window.SITE_CONFIG` 控制 `title` / `subtitle` / `notice`（顶部公告）/ `footerNote`（页脚声明）。**网盘类型**：`window.PAN_MAP` 已内置夸克、百度、阿里云盘、UC、迅雷、天翼、115、123、微云、移动云盘、PikPak，新增一行 `{ '<标识>': { name: '显示名', color: '#3b6bff' } }` 即可。

静态版已实现：全文搜索、分类 / 网盘联动筛选、排序、SVG 二维码生成与 PNG 导出、一键复制链接+提取码（带 Toast 提示）、`#资源id` 深链分享、移动端适配。二维码算法为 Kazuhiko Arase 的 qrcode-generator（MIT），随源码放在 `assets/vendor/`，离线可用。

**部署**：纯静态文件，GitHub Pages / Vercel / Netlify / OSS / COS / Cloudflare Pages / Nginx 均可，无构建步骤；日常更新只需替换 `data/resources.js`。注意：仓库当前为私有，若要用 Pages 对外发布或转公开，请先清理资源数据并补全本页脚合规声明。

## 合规声明

- 本站提供资源信息索引及第三方链接导航，原则上不直接存储任何资源文件
- 请仅收录你拥有合法分发权利的链接，并遵守各网盘平台服务条款
- 涉及版权问题请通过投诉渠道联系，本站将按「投诉 → 核实 → 下架 → 申诉」流程处理（详见 PROJECT_PLAN §11）
