# 星球资源 PlanetResource

综合型网盘资源导航站。收录电影、电视剧、纪录片、动漫、软件、办公模板、电子书、学习课程、设计素材、AI 资源等，统一检索、分类导航，一键跳转夸克 / 百度网盘转存。

**本站只做索引**：不存储、不托管、不提供下载任何文件，页面展示的只是资源信息 + 第三方网盘分享链接。

完整规划见 [PROJECT_PLAN.md](PROJECT_PLAN.md)，本 README 是其对外摘要。Phase 0（纯静态版）已完成使命并归档于 git 历史，当前进入 **Phase 1：Next.js + PostgreSQL 动态版重建**。

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
| Phase 0 | 纯静态版：单页索引 + 二维码 + 前端搜索筛选 | ✅ 已完成，归档于 git 历史 |
| Phase 1–4 | Next.js + PostgreSQL 框架 → 资源系统 → 前台 → 后台 | 🔄 重建进行中 |
| Phase 5 | SEO：Metadata / Sitemap / RSS / JSON-LD | ⬜ 规划中 |
| Phase 6–7 | 链接自动检测、用户投稿与审核 | ⬜ 规划中 |
| Phase 8–9 | AI 整理 / 去重、Hermes Agent 对接 | ⬜ 规划中 |

## 历史版本：Phase 0 纯静态版

静态版（零后端、零数据库、零外网依赖，数据维护在 `data/resources.js`）已从工作区移除，完整代码保留在 git 历史 **commit `e830b34`**。需要参考或临时重新上线时：

```bash
mkdir static-preview && cd static-preview
git archive e830b34 | tar -x      # 解出静态版全套文件
python3 -m http.server 8765       # 或直接双击 index.html
```

静态版能力（全文搜索、分类/网盘联动筛选、排序、SVG 二维码生成与 PNG 导出、复制链接+提取码、`#资源id` 深链分享、移动端适配；二维码算法采用 qrcode-generator（MIT, Kazuhiko Arase），随源码离线可用）及其数据结构、`SITE_CONFIG` / `PAN_MAP` 配置说明，详见该 commit 内的 README。其中 `RESOURCES` 条目结构（id / title / desc / category / pan / url / code / size / tags / date / top）可作为 Phase 1 批量导入数据的格式参考。

## 合规声明

- 本站提供资源信息索引及第三方链接导航，原则上不直接存储任何资源文件
- 请仅收录你拥有合法分发权利的链接，并遵守各网盘平台服务条款
- 涉及版权问题请通过投诉渠道联系，本站将按「投诉 → 核实 → 下架 → 申诉」流程处理（详见 PROJECT_PLAN §11）
