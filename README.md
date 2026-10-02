# 网盘资源分享站

夸克网盘资源索引静态站。数据写在 YAML 里，构建时一次性生成全部页面（海报压缩、二维码、搜索索引、SEO 标签），产出纯静态文件，Nginx 直接托管，无数据库、无后端、无登录。

当前站点：391 个资源（电影 239 / 电视剧 71 / 纪录片 77 / 游戏 2 / 应用 2），全部为真实夸克公开链接。

## 页面形态

| 页面 | 形态 |
|---|---|
| 首页 `/` | 海报宫格，**按新增时间倒序（最新加入的在前）**，前 6 条带「最新」角标 |
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
  游戏.yaml
  应用.yaml
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
categories: [电影, 电视剧, 纪录片, 游戏, 应用]   # 分类栏顺序；未列出的分类按资源数倒序追加在后面
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
  date: 2013-01-30          # 可选，上映 / 发行日期，卡片与详情页展示
  added: 2026-09-21         # 可选，加入时间，决定排序（不填则排最前）
  image: mv-010.jpg         # 可选，默认取 static/images/<id>.<ext>
```

**排序规则**：`added` 倒序 → 同一天的按 id 编号倒序（编号大 = 后加入）→ `date` 倒序 → 文件内原序。
从夸克批量导入时 `added` 取网盘目录的创建时间；手工新增时填上当天日期即可，不填会一直排在最前。

内置网盘字段：`quark_url`、`baidu_url`、`aliyun_url`、`tianyi_url`、`uc_url`、`xunlei_url`、`115_url`、`mobile_url`，对应提取码字段为 `xxx_code`（如 `baidu_code`）。多个链接时详情页会全部列出，二维码可点击切换。

需要其它网盘用通用写法：

```yaml
  links:
    - name: 迅雷网盘
      url: https://pan.xunlei.com/s/xxxx
      code: ab12
```

现站 id 规则：`mv-xxx` 电影、`tv-xxx` 电视剧、`dc-xxx` 纪录片、`game-xxx` 游戏、`app-xxx` 应用，与 `static/images/` 里的配图同名。

**新增一个分类**：建 `data/<分类>.yaml`，把分类名加进 `site.yaml` 的 `categories`（决定分类栏位置，不写则按资源数追加在末尾），`npm run build` 即可——分类页、sitemap、搜索索引都会自动带上。

**配图统一用 600×900 竖版**（2:3），卡片不会裁切变形：

| 类型 | 来源 |
|---|---|
| 电影 / 电视剧 / 纪录片 | TMDB 海报 `https://image.tmdb.org/t/p/w500/<path>.jpg` |
| 游戏 | Steam 竖版封面 `https://cdn.cloudflare.steamstatic.com/steam/apps/<appid>/library_600x900_2x.jpg` |
| 应用 | Mac App Store 官方图标（512×512），用 `sharp` 合成 600×900（浅灰底 + 图标居中 + 底部标注名称） |
| 查不到图 | 留 `image: placeholder.svg`，构建自动回退到 `/img/placeholder.svg` |

## 新增资源

**单条：交互式**

```bash
npm run new          # 逐项询问，按分类写入 data/<分类>.yaml
npm run build
```

**单条：直接改 YAML**，然后 `npm run build`。

**批量：从夸克网盘目录一次性出链**（推荐，新增几十上百条时用）
用夸克 CLI 列目录 → 批量生成公开永久链接 → 抓 TMDB 中文信息（标题、简介、评分、海报）→ 写入 `data/<分类>.yaml` → 构建。

这套流程已固化为 skill：**`~/.workbuddy/skills/quark-resource-sync/`**，直接说「同步夸克资源」即可触发：

```bash
node ~/.workbuddy/skills/quark-resource-sync/scripts/scan-new.mjs --out /tmp/scan.json   # 扫未编号目录、算下一编号、标疑似重复
node ~/.workbuddy/skills/quark-resource-sync/scripts/match-batch.mjs --scan /tmp/scan.json --out /tmp/match.json   # TMDB 匹配
node ~/.workbuddy/skills/quark-resource-sync/scripts/process-batch.mjs --init --scan /tmp/match.json --only mv --start 226 --plan /tmp/plan.json
node ~/.workbuddy/skills/quark-resource-sync/scripts/process-batch.mjs --plan /tmp/plan.json --size 20   # 编号→出链→抓信息→海报→写 YAML
```

配置（token / 代理 / 仓库路径 / 网盘 fid）集中在 `config.env`。最初搭建过程见 Obsidian 笔记 `008网盘推广/2026-09-27-网盘资源分享站搭建方案.md`。

规则：页面标题**不带编号**（编号只在网盘目录名与 id 里）；疑似重复先问再动，不自动删。

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

`public/` 当前约 19MB（391 条资源配图），构建约 9～10s。改了卡片尺寸等图片参数后需 `rm -rf public && npm run build`。

## 部署

产物是纯静态文件，**任何能托管静态文件的地方都能跑**。按目标访问人群选：

| 方案 | 适合 | 说明 |
|---|---|---|
| **VPS + Nginx**（推荐） | 面向国内用户、要绑定自己的域名、要备案 | 完全可控，SEO 与访问速度最好，成本约 20～50 元/月 |
| GitHub Pages | 免费、不想管服务器 | 国内访问不稳定，自定义域名不支持备案 |
| Cloudflare Pages | 免费、海外访问快 | 同上，国内偶发不通 |
| 对象存储 + CDN | 国内且量大 | 需备案，配置最繁琐 |

无论哪种，**构建时必须带上真实域名**，否则 canonical / OG / sitemap 会指向 `example.com`：

```bash
BASE_URL=https://your-domain.com npm run build
```

### 方案 A：VPS + Nginx（推荐）

服务器以 Ubuntu 22.04 为例。

```bash
# 1) 服务器装环境
sudo apt update && sudo apt install -y nginx rsync
sudo mkdir -p /var/www/share-resource
sudo chown -R "$USER" /var/www/share-resource

# 2) 本机配 ssh 免密（之后部署就不用输密码）
ssh-copy-id root@1.2.3.4
```

把 `nginx.conf.example` 放到 `/etc/nginx/conf.d/share-resource.conf`，替换其中的域名：

```bash
sudo sed 's/your-domain.com/你的域名/g' nginx.conf.example | sudo tee /etc/nginx/conf.d/share-resource.conf
sudo nginx -t && sudo systemctl reload nginx
```

申请 HTTPS（certbot 会自动补上 443 段，示例配置里注释掉的那段不用管）：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
```

部署——即构建 + rsync 到服务器：

```bash
BASE_URL=https://你的域名 \
REMOTE_USER=root REMOTE_HOST=1.2.3.4 REMOTE_DIR=/var/www/share-resource \
npm run deploy
```

关键配置项（完整文件见 `nginx.conf.example`）：

| 配置 | 作用 |
|---|---|
| `root /var/www/share-resource` | 指向 `public/` 的内容，不是 `public` 本身 |
| `try_files $uri $uri/ $uri/index.html =404` | 让 `/resource/mv-010/` 这类目录式 URL 命中 `index.html` |
| `error_page 404 /404.html` | 走站内 404 页 |
| 静态资源 `expires 30d`、HTML 不缓存 | 更新即时生效，图片不重复拉取 |

**更新**：改完 YAML 或主题后重跑上面那条 `npm run deploy` 即可（`rsync --delete` 会清掉服务器上已删除的资源页）。
**回滚**：`git` 切回上一个提交重新构建部署；或部署前 `cp -r public public.bak` 留一份。

### 方案 B：GitHub Pages

仓库 Settings → Pages → Source 选 **GitHub Actions**，然后新建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: BASE_URL=https://<用户名>.github.io/<仓库名> npm run build   # 用自定义域名就填该域名
      - uses: actions/upload-pages-artifact@v3
        with:
          path: public
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

推送到 `main` 即自动构建发布。

### 方案 C：Cloudflare Pages

连接仓库后填：

| 项 | 值 |
|---|---|
| Framework preset | None |
| Build command | `BASE_URL=https://<项目名>.pages.dev npm run build` |
| Build output directory | `public` |
| 环境变量 | `NODE_VERSION` = `20` |

自定义域名在 Pages 项目的 Custom domains 里加，然后同步把 `BASE_URL` 改成该域名。

### 部署后自检

```bash
S=https://你的域名
for u in / /category/%E7%94%B5%E5%BD%B1/ /resource/mv-010/ /sitemap.xml \
         /robots.txt /search-index.json /img/mv-010-240.webp /qr/mv-010-quark.svg /nope; do
  printf '%-38s %s\n' "$u" "$(curl -s -o /dev/null -w '%{http_code}' "$S$u")"
done
```

除最后的 `/nope` 应为 **404**，其余全部 **200**。再确认页面源码里的 canonical 是真实域名（`curl -s $S/ | grep canonical`）。

最后把 `https://你的域名/sitemap.xml` 提交到 Google Search Console 与百度站长平台。

### 常见故障

| 现象 | 原因 |
|---|---|
| 全部页面 404 | `root` 指到了 `public` 目录本身，应指向它的内容 |
| `/resource/mv-010/` 404 但文件存在 | `try_files` 少了 `$uri/index.html` |
| 页面无样式 | `theme/assets/` 没拷进产物，检查 `public/assets/` 是否存在 |
| canonical / sitemap 是 `example.com` | 构建时漏了 `BASE_URL` |
| 中文分类页 404 | 浏览器访问正常即可；curl 需用 percent-encoding（如 `%E7%94%B5%E5%BD%B1`） |
| 二维码 / 配图 404 | 图片或链接缺失时用占位图，检查 `static/images/<id>.jpg` 是否存在 |

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
