# 星球资源 PlanetResource · 资源导航站项目规划

| 项目     | 内容                                               |
| ------ | ------------------------------------------------ |
| 项目名称   | 星球资源 PlanetResource（早期草案代号 ResourceHub，候选名见 §14） |
| 项目类型   | 资源导航 / 网盘资源索引 / 资源搜索                             |
| 第一阶段网盘 | 夸克网盘、百度网盘                                        |
| 技术方向   | Next.js + PostgreSQL + Caddy + Docker            |
| 后续扩展   | AI 自动整理、Hermes Agent、用户投稿、多网盘                    |

> 核心理念：**网站负责展示、搜索、数据库和用户体验；网盘负责文件存储；AI / Hermes 负责资源整理和自动化。** 这样设计，即使资源量从几百增长到几十万，也无需推翻系统。

---

## 1. 项目概述

### 1.1 项目定位

建立一个综合型资源导航站，为用户提供以下资源的统一检索与导航：

- 影视：电影、电视剧、纪录片、动漫、综艺
- 软件、办公资源、电子书、学习资料
- 图片素材、视频素材、音乐
- AI 资源、实用工具

### 1.2 职责边界

网站本身**不保存大体积资源文件**，只保存以下元数据，用户点击后跳转至第三方网盘：

```
资源信息 + 分类信息 + 标签 + 资源介绍 + 网盘分享链接 + 提取码 + 链接状态
```

---

## 2. 阶段目标

### 2.1 第一阶段 —— 基础站点

建立一个稳定、简洁、搜索友好的资源网站。核心功能：首页、分类、搜索、资源详情页、夸克/百度网盘链接、后台管理（资源添加 / 编辑）、链接失效检测、SEO、用户投稿。

### 2.2 第二阶段 —— 自动化运营

AI 自动分类、AI 自动生成简介、自动提取资源信息、自动检测重复、自动检测网盘链接、批量导入 / 更新、用户投稿审核。

### 2.3 第三阶段 —— Agent 对接

与 Hermes Agent 对接，形成半自动资源运营系统：

```
Hermes Agent
 ├── 搜索资源
 ├── 整理资源
 ├── AI 分类
 ├── 自动生成标题 / 简介
 ├── 检测重复
 └── 调用网站 API
        ↓
      待审核
        ↓
       发布
```

---

## 3. 信息架构

### 3.1 站点一级结构

```
首页
├── 影视：电影 / 电视剧 / 纪录片 / 动漫 / 综艺 / 4K·蓝光
├── 软件：Windows / macOS / Linux / Android / iOS / 软件合集
├── 办公：Word / Excel / PowerPoint / Office / 模板 / 字体 / PDF
├── 学习：编程 / AI / 外语 / 考试 / 职业技能
├── 电子书：小说 / 技术 / 人文 / 社科 / 有声书
├── 素材：图片 / 视频 / 音乐 / PSD / 设计素材
├── AI：AI 软件 / AI 教程 / Prompt / AI 模型
└── 工具：在线工具 / 开源项目 / 实用工具 / 网站导航
```

### 3.2 分类细分

**影视**

| 一级  | 二级                                             |
| --- | ---------------------------------------------- |
| 电影  | 国产 / 欧美 / 日韩 / 港台 / 印度 / 动画电影 / 纪录电影 / 4K / 蓝光 |
| 电视剧 | 国产剧 / 美剧 / 英剧 / 日剧 / 韩剧 / 港剧 / 台剧 / 短剧         |
| 纪录片 | 自然 / 历史 / 科技 / 社会 / 地理 / 军事 / 人物 / 纪录系列        |
| 动漫  | 国产动漫 / 日本动漫 / 欧美动漫 / 动画电影 / 动漫合集               |

**软件**

- 平台维度：Windows / macOS / Linux / Android / iOS
- 用途维度（二级分类）：办公、开发、设计、视频、音频、网络、安全、系统工具、压缩、下载、截图、远程控制、虚拟机、AI

**办公资源**

- Microsoft Office：Word / Excel / PowerPoint / PDF
- 模板：PPT / Excel / Word 模板；简历、合同、公文、报告、财务、教育模板
- 字体、图标、办公素材

**学习资源**

- 编程 / AI：Python、Java、JavaScript、Linux、数据库、网络
- 外语：英语、日语、其他语言
- 考试：考研、公务员、教师资格、职业资格
- 职业技能：摄影、视频、设计、写作、运营

**电子书**

小说、文学、历史、哲学、心理学、经济、商业、管理、计算机、编程、AI、摄影、设计、医学、教育、社科、儿童、有声书。

**标签体系（示例）**

`4K`、`1080P`、`HDR`、`H.265`、`中文字幕`、`Netflix`、`Apple TV+`、`科幻`、`动作`、`喜剧`、`Windows`、`macOS`、`AI`、`Python`、`Excel`

### 3.3 页面规划

**首页**（建议以搜索框为视觉中心）

```
┌───────────────────────────────────────┐
│           ResourceHub                 │
│   搜索电影、软件、办公、学习资源       │
│   [ 🔍 输入资源名称................ ]  │
└───────────────────────────────────────┘
```

模块：Logo、导航、搜索框、热门分类、最新资源、热门资源、热门搜索、友情链接。

**资源详情页**（URL：`/resource/black-mirror-season-7`）

- 标题、封面、简介
- 基本信息：分类、标签、资源大小、版本、清晰度、语言、更新时间
- 下载链接区：

```
黑镜 第七季
2025 ｜ 电视剧 / 科幻 / 剧情 ｜ 清晰度：1080P ｜ 字幕：简体中文

简介：……

下载：
🟢 夸克网盘 [打开资源]
🔵 百度网盘 [打开资源]
```

### 3.4 SEO URL 结构

```
/film/  /tv/  /documentary/  /anime/  /software/  /office/
/ebook/  /course/  /material/  /ai/  /tool/

资源详情：/film/xxx  /tv/xxx  /software/xxx  /ebook/xxx
```

---

## 4. 数据库设计

### 4.1 表清单

核心表：`resources`、`categories`、`tags`、`resource_tags`、`resource_links`；配套表：`users`、`submissions`、`link_checks`、`search_logs`、`view_logs`。

### 4.2 资源表 resources

```sql
CREATE TABLE resources (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    category_id BIGINT NOT NULL,
    subcategory_id BIGINT,
    description TEXT,
    cover_url TEXT,
    year INT,
    region VARCHAR(100),
    language VARCHAR(100),
    quality VARCHAR(100),
    size VARCHAR(100),
    version VARCHAR(100),
    author VARCHAR(255),
    publisher VARCHAR(255),
    status VARCHAR(30) DEFAULT 'published',
    views BIGINT DEFAULT 0,
    likes BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.3 分类表 categories（支持无限级）

```sql
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    parent_id BIGINT,          -- 支持无限级，如 影视 → 电视剧 → 美剧
    icon VARCHAR(100),
    sort_order INT DEFAULT 0,
    status BOOLEAN DEFAULT TRUE
);
```

### 4.4 标签表 tags 与关联表

```sql
CREATE TABLE tags (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE resource_tags (
    resource_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    PRIMARY KEY(resource_id, tag_id)
);
```

### 4.5 网盘链接表 resource_links

> 网盘链接不塞进 resources，单独建表，且**不限制网盘类型数量**。

```sql
CREATE TABLE resource_links (
    id BIGSERIAL PRIMARY KEY,
    resource_id BIGINT NOT NULL,
    pan_type VARCHAR(30) NOT NULL,
    url TEXT NOT NULL,
    password VARCHAR(100),
    status VARCHAR(30) DEFAULT 'unknown',
    last_checked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.6 状态机

| 对象   | 状态                                           |
| ---- | -------------------------------------------- |
| 资源   | `draft` / `published` / `hidden` / `deleted` |
| 网盘链接 | `unknown` / `active` / `expired` / `blocked` |

### 4.7 网盘支持规划

| 阶段   | 网盘                                 |
| ---- | ---------------------------------- |
| 第一阶段 | quark（夸克）、baidu（百度）                |
| 第二阶段 | aliyun、115、uc、123pan、pikpak        |
| 第三阶段 | Google Drive、OneDrive、Dropbox、MEGA |

---

## 5. 核心功能设计

### 5.1 搜索系统

搜索是网站最核心的功能之一。

**搜索范围**：标题、别名、简介、标签、作者、软件版本、年份、分类。  
例：搜索 `Office` 应返回 Office 2024 / 2021 / Microsoft 365 / Office Mac / Office Windows / Office 模板 / Office 教程。

**搜索过滤**（结果页侧栏）：分类、年份、网盘、平台、清晰度、语言、文件类型、更新时间。

**排序**：综合（相关度 + 热度 + 更新时间，默认）、最新、最热门、最多下载、最多收藏。

### 5.2 资源重复检测

添加资源时自动检查：标题完全相同 / 标题相似 / 网盘链接相同 / 文件大小相同 / 版本相同。

```
检测到可能重复：Office 2024 for Mac
已有资源：/resource/office-2024-mac
[查看] [仍然创建]
```

AI 重复检测（第二阶段）：识别「黑镜 第七季 / Black Mirror Season 7 / 黑镜 S07 / Black Mirror S07 1080P」为同一资源，提示相似度（如 92%）并链接已有资源。

### 5.3 网盘链接检测

```
Cron → 获取待检测链接 → 检测 → 更新状态
```

状态：🟢 正常 / 🟡 无法确定 / 🔴 失效；记录 `last_checked_at`、`status`、`error_message`。

### 5.4 用户投稿

用户可提交：资源名称、分类、简介、夸克链接、百度链接、提取码、备注。  
投稿状态：`pending` → `approved` / `rejected`。  
审核流程：待审核 → 检查重复 → 检查链接 → 编辑 → 发布。

### 5.5 后台管理

后台地址：`/admin`（须严格限制访问）。

```
Dashboard
资源管理：全部资源 / 已发布 / 草稿 / 已隐藏 / 回收站
分类管理 ｜ 标签管理
网盘链接：正常 / 失效 / 待检测
投稿管理：待审核 / 已通过 / 已拒绝
用户管理 ｜ 评论管理 ｜ SEO ｜ 系统设置 ｜ 日志
```

**Dashboard 指标**

- 资源：总数、今日 / 本周 / 本月新增
- 访问：今日 / 本周 / 本月访问量
- 运营：失效链接数、待审核投稿数
- 内容：热门资源、热门搜索

```
资源总数 32,581 ｜ 今日新增 126 ｜ 失效链接 382 ｜ 待审核 27
今日访问 18,521 ｜ 本月访问 521,829
```

### 5.6 批量导入

支持 CSV / JSON / Excel / TXT。格式示例：

```csv
title,category,pan,url,password
Office 2024,软件,quark,https://...,xxxx
```

流程：上传 → 解析 → 检查重复 → 检查错误 → 预览 → 确认 → 导入。

### 5.7 AI 自动整理（第二阶段）

后台「AI 整理资源」：输入 `黑镜 第七季 1080P` + 夸克链接，AI 自动生成：

- 标题：黑镜 第七季；分类：影视 > 电视剧；年份：2025
- 标签：科幻、剧情、Netflix、1080P
- 简介、网盘类型识别

管理员操作：[通过] [修改] [拒绝]。

### 5.8 互动功能

- **评论系统**：资源页支持评论（如"链接已失效""文件可正常使用"）、回复、点赞、举报、删除。
- **举报系统**：链接失效 / 信息错误 / 重复资源 / 恶意内容 / 侵权投诉 / 其他 → 后台管理员处理（忽略 / 修改 / 隐藏 / 删除）。
- **收藏功能**：登录用户可收藏 / 取消收藏，个人中心按分类查看（电影、软件、电子书、办公等）。
- **评分**：第一阶段不做复杂评分，仅 👍 有用（views / likes），后续再考虑。

### 5.9 统计与推荐

**统计系统**：PV / UV、资源浏览、搜索关键词、网盘点击、分类访问。例如某资源浏览 15,821、夸克点击 8,231、百度点击 3,921 —— 用于判断用户真实需求。

**热门搜索**：记录并生成榜单，如 1. Office 2. Windows 3. Photoshop 4. PPT模板 5. 黑镜。

**相关推荐**：详情页按同系列 / 同类目推荐（黑镜各季；Photoshop → Illustrator / Premiere Pro / After Effects / Lightroom）。

---

## 6. API 设计

统一前缀：`/api/v1/`。

### 6.1 公开 API

| 方法  | 路径                         | 说明                                                |
| --- | -------------------------- | ------------------------------------------------- |
| GET | `/api/v1/resources`        | 资源列表（参数：keyword、category、tag、pan、page、limit、sort） |
| GET | `/api/v1/resources/:id`    | 资源详情                                              |
| GET | `/api/v1/search?q=office`  | 搜索                                                |
| GET | `/api/v1/categories`       | 分类列表                                              |
| GET | `/api/v1/resources/latest` | 最新资源                                              |
| GET | `/api/v1/resources/hot`    | 热门资源                                              |

### 6.2 管理 API

| 方法     | 路径                            | 说明   |
| ------ | ----------------------------- | ---- |
| POST   | `/api/v1/admin/resources`     | 添加资源 |
| PUT    | `/api/v1/admin/resources/:id` | 修改资源 |
| DELETE | `/api/v1/admin/resources/:id` | 删除资源 |

### 6.3 Hermes Agent API

独立前缀 `/api/v1/agent/`，采用 Bearer Token 鉴权。

```json
POST /api/v1/agent/resources
{
  "title": "Office 2024",
  "category": "software",
  "subcategory": "office",
  "pan": "quark",
  "url": "https://pan.quark.cn/...",
  "password": "",
  "description": "...",
  "tags": ["Office", "Windows", "办公"]
}
```

处理链路：API → 验证 Token → 检查重复 → AI 整理 → 进入待审核。**不要让 Agent 默认直接发布。**

---

## 7. Hermes Agent 自动化架构

```
            Hermes Agent
                 │
    ┌────────────┼────────────┐
    ↓            ↓            ↓
  搜索         整理          检查
    │            │            │
    └────────────┼────────────┘
                 ↓
            网站 API
                 ↓
            去重系统
                 ↓
             AI 分类
                 ↓
             待审核
                 ↓
             管理员
                 ↓
              发布
```

---

## 8. 技术架构

### 8.1 整体架构

```
              Internet
                 ↓
               Caddy
                 ↓
              Next.js
              /      \
             ↓        ↓
       PostgreSQL    Redis
             ↓
          Worker
             │
    ┌────────┼─────────┐
    ↓        ↓         ↓
  链接检测   AI 任务   定时任务
```

**第一版只需：Caddy + Next.js + PostgreSQL**，Redis 第二阶段再加入。

### 8.2 技术栈

| 项目      | 选型                                           |
| ------- | -------------------------------------------- |
| 操作系统    | Debian 13                                    |
| Web 服务器 | Caddy                                        |
| 前端 / 后端 | Next.js（含 API Routes）                        |
| 数据库     | PostgreSQL（全文搜索：PostgreSQL Full Text Search） |
| ORM     | Prisma                                       |
| 容器      | Docker                                       |
| 认证      | Auth.js                                      |
| 任务      | Cron                                         |
| AI      | OpenAI-compatible API                        |
| Agent   | Hermes Agent                                 |
| 第一阶段网盘  | 夸克、百度                                        |

### 8.3 Docker 编排

`docker-compose.yml` 服务：第一阶段 `app` + `postgres`；后续加 `redis`。

### 8.4 项目目录

```
resourcehub/
├── app/
│   ├── page.tsx
│   ├── search/  ├── category/  ├── resource/
│   ├── login/   ├── admin/     └── api/
├── components/
│   ├── Header.tsx  ├── Footer.tsx      ├── SearchBox.tsx
│   ├── ResourceCard.tsx  ├── CategoryCard.tsx  └── Pagination.tsx
├── lib/
│   ├── db.ts  ├── auth.ts  ├── search.ts  └── pan.ts
├── prisma/schema.prisma
├── workers/
│   ├── link-checker.ts  ├── ai-worker.ts  └── crawler.ts
├── public/  ├── scripts/
├── docker-compose.yml  ├── Dockerfile
├── package.json  └── README.md
```

### 8.5 缓存策略

- 第一阶段：Next.js Cache
- 第二阶段：Redis
- 缓存对象：首页、分类、热门资源、热门搜索、资源详情；**搜索结果不做无限缓存**。

---

## 9. 安全与权限

### 9.1 安全清单

HTTPS、CSRF、XSS 防护、SQL 注入防护、Rate Limit、登录保护、管理员 2FA、API Token、日志。`/admin` 严格限制；Agent API 使用 Bearer Token。

### 9.2 用户与角色（RBAC）

**第一阶段**：游客 + 管理员。  
**第二阶段**：游客 / 普通用户 / 投稿用户 / 审核员 / 管理员 / 超级管理员。

| 角色    | 权限                |
| ----- | ----------------- |
| 超级管理员 | 管理用户、管理员、资源、分类、系统 |
| 普通管理员 | 资源管理、投稿审核、链接管理    |
| 审核员   | 仅审核投稿             |

---

## 10. SEO 规划

- 每个资源生成独立页面，如 `/resource/black-mirror-s07`
- Title：`黑镜第七季 1080P 网盘资源 - ResourceHub`
- Description：`黑镜第七季资源信息，提供资源介绍、版本、清晰度及相关网盘分享入口。`
- 自动生成：`sitemap.xml`、`robots.txt`、RSS（`/feed.xml`：最新资源 / 最新电影 / 最新软件 / 最新办公资源）、Open Graph、JSON-LD


## 12. 实施计划

### 12.1 MVP 范围（第一版只做）

**[必须]**：首页、搜索、分类、资源详情、资源添加 / 编辑、夸克、百度、后台、SEO、移动端。

**第二阶段**：用户投稿、链接检测、收藏、热门、统计、批量导入。  
**第三阶段**：AI、Hermes Agent、自动分类、自动去重、自动整理、Telegram Bot。

### 12.2 开发阶段

| Phase    | 内容                                             | 交付                                  |
| -------- | ---------------------------------------------- | ----------------------------------- |
| 1 基础框架   | Next.js / PostgreSQL / Prisma / Docker / Caddy | 项目启动、数据库、后台登录                       |
| 2 资源系统   | —                                              | 分类、标签、资源、网盘链接                       |
| 3 前台     | —                                              | 首页、搜索、分类页、资源页                       |
| 4 后台     | —                                              | 资源 / 分类 / 标签 / 链接管理                 |
| 5 SEO    | —                                              | Metadata、Sitemap、RSS、Robots、JSON-LD |
| 6 链接检测   | —                                              | 自动检测、失效标记、检测日志                      |
| 7 投稿     | —                                              | 用户投稿、审核、发布                          |
| 8 AI     | —                                              | AI 分类、AI 摘要、AI 标签、AI 去重             |
| 9 Hermes | —                                              | Agent API、Token、自动提交、自动整理           |

### 12.3 功能优先级

| 功能                       | 优先级   |
| ------------------------ | ----- |
| 资源数据库、搜索、资源详情页、后台管理、分类系统 | ★★★★★ |
| 夸克网盘、百度网盘、SEO、移动端        | ★★★★★ |
| 链接检测、用户投稿、批量导入           | ★★★★☆ |
| AI 整理、Hermes Agent       | ★★★☆☆ |
| Telegram Bot             | ★★☆☆☆ |
| 会员系统、广告系统                | ★☆☆☆☆ |

### 12.4 MVP 验收标准

- 首页 / 手机端 / 分类 / 搜索 / 资源详情正常
- 夸克、百度链接正常
- 后台可添加 / 修改 / 删除资源
- 支持标签、分页、SEO、Sitemap、HTTPS
- 管理员权限正常
- 数据库自动备份
- 基础访问统计正常

### 12.5 资源生命周期

```
发现资源 → 提交 → 解析 → AI分类 → 重复检测 → 链接检测
→ 管理员审核 → 发布 → 用户访问 → 定期检查
→ 链接失效 → 标记失效 → 更新链接
```

---

## 13. 移动端与后续扩展

- **移动端**：第一版起必须支持（手机搜索、分类、资源详情、网盘按钮；首页不堆砌）。
- **PWA**：后期支持添加到主屏幕，非 MVP 必需。
- **广告**：第一阶段不放；流量稳定后再考虑 AdSense / 联盟广告 / 赞助 / 会员，广告不得影响搜索和下载按钮。
- **会员体系**：后期考虑免费 / VIP，不建议第一阶段开发。
- **多渠道**：Telegram Bot（`/search office`）、Discord Bot、微信通知、邮件通知、RSS、API、浏览器扩展、手机客户端。
- **订阅通知**：用户订阅关键词（Office、黑镜、AI、Mac 软件），新资源出现时推送。

### 最终形态架构

```
                用户
       ┌─────────┴─────────┐
      Web               Telegram
       └─────────┬─────────┘
                API
    ┌────────────┼────────────┐
 搜索系统      用户系统      资源系统
                 ┌─────┼─────┐
               夸克   百度  其他网盘
                PostgreSQL
           ┌────────┴────────┐
       定时任务          AI Worker
       链接检测        AI分类/整理 → Hermes Agent
```

最终不是「网站 + 一堆网盘链接」，而是：搜索 / 分类 / 推荐 → 资源数据库 → 多网盘 → AI 自动整理 → Hermes Agent → **自动运营**。

---

## 14. 项目命名建议

候选：资源星球、资源库、资源导航、资源岛、资源中心、资源仓库、资源集、ResourceHub、ResourceBox、ResourceNest、ResourceBase。

**已定名**：**星球资源 · PlanetResource**。本地目录 `~/Documents/GitHub/PlanetResource`；远程为 GitHub 私有仓库 `linuxhobby/PlanetResource`（原 `pan-share` 仓库已弃用）。文档内示例中残留的 ResourceHub 为早期草案代号。

**建议**：若打算长期运营，选用中性、易扩展的名称（如 ResourceHub），不把品牌限定在"网盘"或"影视"，后续增加软件、AI、电子书、办公、课程、素材、工具时无需更换品牌。

---

## 下一步

本规划可直接作为 `PROJECT_PLAN.md`。下一步最适合进入：**数据库设计 + Next.js 项目目录 + Prisma Schema + Docker Compose**，按 §12 的 Phase 1 开始第一版。

可选深化方向：

1. 自动化功能实现细节
2. 后台管理系统设计细节
3. Hermes Agent 与网站 API 的集成技术
