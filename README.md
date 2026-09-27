# 网盘资源分享站

夸克网盘资源索引静态站。数据写在 YAML 里，构建时一次性生成全部页面（海报压缩、二维码、搜索索引、SEO 标签），产出纯静态文件，Nginx 直接托管，无数据库、无后端、无登录。

当前站点：100 个资源（电影 10 / 电视剧 13 / 纪录片 77），全部为真实夸克公开链接。

## 页面形态

| 页面 | 形态 |
|---|---|
| 首页 `/` | 海报宫格，**按日期倒序（最新在最前）**，前 6 条带「最新」角标 |
| 分类页 `/category/<分类>/` | 同样的宫格，只含该分类 |
| 详情页 `/resource/<id>/` | 180×260 海报 + 120×120 二维码 + 网盘链接与复制按钮 |
| 搜索 | 顶栏即时搜索，结果同样以宫格呈现，命中词高亮 |

宫格为等宽自适应列，随屏幕宽度递减：**5 列 → 4 列（<1000px）→ 3 列（<820px）→ 2 列（<480px）**。

## 快速开始

```bash
npm install          # 依赖：js-yaml、qrcode；sharp 可选
npm run build        # 构建到 public/
npm run serve        # 本地预览 http://localhost:4321
npm run dev          # build + serve 一步到位
```

> 建议装上 `sharp`（`npm i sharp`）：配图会被压缩成 WebP 三档尺寸（详情页 180×260、宫格卡片 240×360、缩略图 60×90）。未安装时按原图复制，靠 CSS 裁切，体积会大很多。
> 拼音搜索需要 `pinyin-pro`（已在 devDependencies，构建机使用，不进产物）。

## 目录结构

```
data/
  site.yaml          # 站点配置：站名、分类顺序、免责声明、首屏条数
  电影.yaml           # 资源数据，一个分类一个文件，构建时自动合并
  电视剧.yaml
  纪录片.yaml
static/images/       # 配图，文件名与资源 id 对应：<id>.jpg / .png / .webp / .svg
theme/assets/        # style.css、app.js（构建时拷到 public/assets/）
scripts/
  build.js           # 构建主流程
  serve.js           # 零依赖本地预览服务（含正确的 404 状态码）
  new-resource.js    # 交互式新增资源
  deploy.sh          # 构建 + rsync 到 VPS
  lib/               # data.js（解析/规整）、assets.js（图片与二维码）、render.js（页面模板）
public/              # 构建产物，部署这个目录
nginx.conf.example   # Nginx 配置参考
```

## 站点配置 `data/site.yaml`

```yaml
title: 网盘资源站
description: 夸克 / 百度网盘资源索引，打开即用，扫码即存
disclaimer: 本站仅提供网盘资源索引，所有文件均存放于第三方网盘…
categories: [电影, 电视剧, 纪录片]   # 分类栏顺序；未列出的分类按资源数倒序追加在后面
icp: ""                              # 备案号，留空不显示
pageSize: 35                         # 首屏渲染条数，其余由「加载更多」渲染
```

`pageSize` 只影响首屏 HTML 体积，**不会影响 SEO**：全部详情页都在 `sitemap.xml` 里。宫格布局下建议填 5 的倍数，避免末行缺角。

## 数据格式

一条列表项 = 一个详情页：

```yaml
- id: mv-010               # 可选，留空自动生成；决定详情页 URL 与配图文件名
  title: "柏林谍变"         # 必填
  category: 电影            # 必填，自动出现在分类栏
  tags: ["电影", "动作"]     # 可选，数组或逗号分隔
  quark_url: https://pan.quark.cn/s/xxxx    # 各网盘链接，至少填一个
  baidu_url: https://pan.baidu.com/s/xxxx
  baidu_code: sf2k          # 提取码
  description: 4K 国语中字   # 可选，详情页正文
  date: 2013-01-30          # 可选，用于倒序排序（不填排最后）
  image: mv-010.jpg         # 可选，默认取 static/images/<id>.<ext>
```

内置网盘字段：`quark_url`、`baidu_url`、`aliyun_url`、`tianyi_url`、`uc_url`、`xunlei_url`、`115_url`、`mobile_url`，对应提取码字段为 `xxx_code`（如 `baidu_code`）。多个链接时详情页会全部列出，二维码可点击切换。

需要其它网盘用通用写法：

```yaml
  links:
    - name: 迅雷网盘
      url: https://pan.xunlei.com/s/xxxx
      code: ab12
```

现站 id 规则：`mv-xxx` 电影、`tv-xxx` 电视剧、`dc-xxx` 纪录片，与 `static/images/` 里的海报同名。

## 新增资源

**单条：交互式**

```bash
npm run new          # 逐项询问，按分类写入 data/<分类>.yaml
npm run build
```

**单条：直接改 YAML**，然后 `npm run build`。

**批量：从夸克网盘目录一次性出链**（推荐，新增几十上百条时用）
用夸克 CLI 列目录 → 批量生成公开永久链接 → 抓 TMDB 中文信息（标题、简介、评分、海报）→ 写入 `data/<分类>.yaml` → 构建。完整可复用提示词、命令与踩坑记录已固化在 Obsidian 笔记 `008网盘推广/2026-09-27-网盘资源分享站搭建方案.md`，换目录改路径即可复用。

```bash
# 列目录：stdout 只有前 5 条预览，必须读输出里 artifact 指向的 jsonl
node ~/.workbuddy/skills/quarkclouddrive/scripts/quark-drive.cjs browse --all --page-size 100 --parent-fid <fid>
# 出链：一条目录一个链接，公开无提取码 + 永久有效
node ~/.workbuddy/skills/quarkclouddrive/scripts/quark-drive.cjs share <fid> --title "<目录名>" --url-type 1 --expired-type 1
```

批量出链串行约 20s/条，建议并发 5。

## 构建产物

| 路径 | 说明 |
|---|---|
| `/` | 首页宫格（首屏 `pageSize` 条静态渲染，其余由「加载更多」渲染） |
| `/category/<分类>/` | 分类页 |
| `/resource/<id>/` | 详情页 |
| `/search-index.json` | 全站搜索索引，首次搜索时按需加载 |
| `/img/<id>-240.webp` `-180.webp` `-60.webp` | 宫格卡片 / 详情页 / 缩略图 |
| `/img/placeholder.svg` | 缺图时的统一占位图 |
| `/qr/<id>-<网盘>.svg` | 构建时预生成的二维码 |
| `/sitemap.xml` `/robots.txt` `/404.html` | SEO 与兜底 |

`public/` 当前约 2.5MB，构建约 1.3～2s。

## 部署

**必须带上域名构建**，否则 canonical / OG / sitemap 会指向 `example.com`：

```bash
BASE_URL=https://your-domain.com npm run build
```

一键同步到 VPS（rsync，建议先配好 ssh 免密）：

```bash
REMOTE_USER=root REMOTE_HOST=1.2.3.4 REMOTE_DIR=/var/www/share-resource npm run deploy
```

Nginx 要点（完整配置见 `nginx.conf.example`）：`root` 指向 `public/` 内容，`try_files $uri $uri/ $uri/index.html =404`，`error_page 404 /404.html`，静态资源缓存 30 天、HTML 不缓存。

## 调整首页观感

| 想改什么 | 改哪里 |
|---|---|
| 每行卡片数 | `theme/assets/style.css` 的 `.grid { grid-template-columns: repeat(5, …) }` 及各断点（1180px 容器配 5 列） |
| 首屏条数 | `data/site.yaml` 的 `pageSize` |
| 卡片标题/日期字号 | `.tile__title`（16px）、`.tile__meta`（14px） |
| 「最新」角标数量 | `scripts/lib/render.js` 的 `NEWEST_BADGE`，与 `theme/assets/app.js` 的 `NEWEST` 保持一致 |
| 卡片尺寸 | `scripts/lib/assets.js` 的 `CARD = { w: 240, h: 360 }`（改后需 `rm -rf public && npm run build`） |

## 实现要点

- 二维码构建期用 `qrcode` 生成 SVG 落盘，页面只引用静态图片，不依赖 JS
- 搜索纯客户端：列表页内联本页数据（离线可用），跨页搜索再拉 `search-index.json`
- 复制按钮用 `navigator.clipboard`，不支持时回退 `execCommand`
- 无登录、无评论、无广告、无动画；列表页宽容器 1180px，详情页 760px 居中

## SEO

构建时自动生成，无需手工维护：

| 项目 | 说明 |
|---|---|
| `title` / `description` | 每页独立；详情页用「标题 - 站名」，描述取简介前 100 字 |
| `canonical` | 每页指向自身绝对地址，避免 `/index.html` 与 `/` 重复 |
| OG / Twitter Card | `og:title` / `og:description` / `og:image` / `og:url`，分享有卡片 |
| JSON-LD | 详情页 `Movie` / `TVSeries`（按分类）+ 面包屑；列表页 `WebSite`（含 SearchAction）+ `CollectionPage` |
| `sitemap.xml` | 首页 + 分类页 + 全部详情页，带 `lastmod` 与优先级 |
| `robots.txt` | 全站开放，并声明 sitemap 地址 |
| 性能 | 首屏前 5 张图 `eager + fetchpriority=high`（LCP），其余懒加载 |

## 站内搜索

顶栏搜索框，纯前端、无后端、输入即时出结果：

- **拼音**：`taikong`、`tkbd` 都能搜到「太空部队」（构建期用 `pinyin-pro` 生成全拼与首字母，产物只存字符串）
- **相关度排序**：标题完全匹配 100 > 前缀 60 > 包含 40 > 全拼 30/18 > 首字母 26/14 > 标签 22 > 简介 12；多词为「与」关系
- **命中高亮**：标题里命中的关键词用 `<mark>` 标出
- **防抖 120ms**，结果最多 120 条
- **快捷键**：`Ctrl/⌘ + K` 或 `/` 聚焦，`Esc` 清空
- **URL 同步**：搜索时地址栏变成 `/?q=关键词`，可直接分享
