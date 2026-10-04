# ShareResource · 网盘资源分享站

用 YAML 写资源，构建成**纯静态站点**：海报压缩、二维码、搜索索引、SEO 标签全部在构建期生成，产物丢给 Nginx 就能跑。无数据库、无后端、无登录。

| | |
|---|---|
| 线上 | https://www.wodewangpan.top |
| 仓库 | `git@github.com:linuxhobby/ShareResource.git` |
| 内容 | 399 个资源 · 7 个分类（电影 241 / 电视剧 72 / 纪录片 77 / 动漫 1 / 游戏 2 / 软件 5 / 其他 1） |
| 更新方式 | 推到 `main`，VPS 每 30 分钟自动拉取并重建 |

## 特性

- **数据即内容**：一个分类一个 YAML，改完 `npm run build` 就出整站；头部注释的条数由构建自动刷新
- **构建期图片处理**：配图压成三档 WebP（详情 180×260、卡片 240×360、缩略图 60×90）
- **二维码预生成**：`qrcode` 出 SVG 落盘，页面只引用静态图，不依赖 JS
- **纯前端搜索**：支持拼音全拼与首字母、命中高亮、`?q=` 可分享
- **SEO 全自带**：canonical、OG / Twitter Card、JSON-LD、sitemap、robots、404 兜底
- **响应式宫格**：5 列 → 4 列（<1000px）→ 3 列（<820px）→ 2 列（<480px）
- **分类占位海报**：资源缺图时自动套用所属分类的海报（渐变底 + 专属底纹 + 徽章图标 + 中英文分类名），7 个分类各有配色与纹样，构建时按分类生成，未知分类按名称派生色相
- **访问统计自备**：服务端解析 Nginx 日志生成 `/stats.json`，页脚显示「总访问量 / 访客数 / 今日 / 今日访客」，不依赖任何第三方统计服务

## 快速开始

```bash
npm install          # 依赖：js-yaml、qrcode；sharp 与 pinyin-pro 可选
npm run build        # 构建到 public/（本地约 9s）
npm run serve        # 本地预览 http://localhost:4321（含正确的 404 状态码）
npm run dev          # build + serve 一步到位
```

> `sharp`（`npm i sharp`）负责压缩与裁切，未安装则按原图复制，体积会大很多。
> `pinyin-pro`（已在 devDependencies）只用于构建期生成拼音索引，不进产物。

**正式构建必须带真实域名**，否则 canonical / OG / sitemap 会指向 `example.com`：

```bash
BASE_URL=https://www.wodewangpan.top npm run build
```

## 目录结构

```
data/
  site.yaml          # 站点配置：站名、分类顺序、免责声明、首屏条数
  电影.yaml           # 资源数据，一个分类一个文件，构建时自动合并
                     # 头部注释的条数（如「（239 条）」）由 npm run build 自动刷新，不用手改
  电视剧.yaml
  纪录片.yaml
  动漫.yaml
  游戏.yaml
  软件.yaml
static/
  favicon.svg        # 站点图标源文件，构建时生成 favicon.svg / favicon.ico / apple-touch-icon.png
  images/            # 配图，文件名与资源 id 对应：<id>.jpg / .png / .webp / .svg
theme/assets/        # style.css、app.js（构建时拷到 public/assets/）
scripts/
  build.js           # 构建主流程
  serve.js           # 零依赖本地预览服务
  new-resource.js    # 交互式新增资源
  deploy.sh          # 构建 + rsync 到 VPS（备用部署方式）
  lib/               # data.js（解析/规整）、assets.js（图片与二维码）、render.js（页面模板）
tools/
  sitestats.py       # 本地访问统计，部署时放到 VPS 的 /usr/local/bin/sitestats.py
  icon-poster.mjs    # 把应用图标（App Store 官方图）合成为 2:3 竖版海报，给软件/音频等无 TMDB 海报的资源用
public/              # 构建产物，部署这个目录（约 19MB）
nginx.conf.example   # Nginx 配置参考
```

## 页面形态

| 页面 | 形态 |
|---|---|
| `/` | 首页宫格，**按 `added` 倒序（最新加入在前）**，最前 6 条带「最新」角标 |
| `/category/<分类>/` | 同样的宫格，只含该分类 |
| `/resource/<id>/` | 180×260 海报 + 120×120 二维码 + 网盘链接与复制按钮 |
| 搜索 | 顶栏即时搜索，结果同样宫格呈现，命中词高亮 |

## 站点配置 `data/site.yaml`

```yaml
title: 我的网盘资源站
description: 夸克 / 百度网盘资源索引，打开即用，扫码即存
# 首页 SEO 文案（可选，不填则回退用站名与站描述）；{total} = 资源总数，{categories} = 分类列表
homeTitle: 我的网盘资源站 - 夸克/百度网盘资源索引   # 首页 title，构建时自动追加「（396 部）」
homeDesc: 夸克 / 百度网盘资源索引，收录 {total} 个{categories}资源，打开即用，扫码即存
homeH1: 网盘资源索引 · 全部资源                 # 首页 H1（分类页仍用分类名）
disclaimer: 本站仅提供网盘资源索引，所有文件均存放于第三方网盘…
categories: [电影, 电视剧, 纪录片, 动漫, 游戏, 软件, 其他]   # 分类栏顺序；未列出的按资源数倒序追加在末尾
icp: ""                              # 备案号，留空不显示
stats: local                         # 页脚访问统计：local = 本地（读 /stats.json）｜busuanzi = 不蒜子｜留空不显示
pageSize: 35                         # 首屏渲染条数，其余由「加载更多」渲染
```

`stats: local` 依赖 VPS 上的 `/stats.json`（见「访问统计」一节）；本机预览或没部署统计脚本时数字保持占位符 `–`，页面照常。

`pageSize` 只影响首屏 HTML 体积，**不影响 SEO**（全部详情页都在 `sitemap.xml` 里）。宫格布局下建议填 5 的倍数，避免末行缺角。

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
  description: 4K 国语中字   # 可选，详情页正文。TMDB 完整简介（上限 300 字），卡片摘要 40 字、meta 160 字由构建自动截取
  date: 2013-01-30          # 可选，上映 / 发行日期
  added: 2026-09-21         # 可选，加入时间，决定排序（不填则排最前）
  image: mv-010.jpg         # 可选，默认取 static/images/<id>.<ext>
```

**排序**：`added` 倒序 → 同日按 id 编号倒序（编号大 = 后加入）→ `date` 倒序 → 文件内原序。
从夸克批量导入时 `added` 取网盘目录创建时间；手工新增填当天日期即可。

内置网盘字段：`quark_url`、`baidu_url`、`aliyun_url`、`tianyi_url`、`uc_url`、`xunlei_url`、`115_url`、`mobile_url`，提取码为对应 `xxx_code`。多个链接时详情页全部列出，二维码可点击切换。其它网盘用通用写法：

```yaml
  links:
    - name: 迅雷网盘
      url: https://pan.xunlei.com/s/xxxx
      code: ab12
```

**id 规则**：`mv-` 电影、`tv-` 电视剧、`dc-` 纪录片、`an-` 动漫、`game-` 游戏、`app-` 软件，与 `static/images/` 里的配图同名。（页面标题不带编号，编号只在 id 与网盘目录名里。）

**新增一个分类**：建 `data/<分类>.yaml`，把分类名加进 `site.yaml` 的 `categories`，`npm run build` 即可——分类页、sitemap、搜索索引都会自动带上。

### 配图规范

统一 **600×900 竖版（2:3）**，卡片不会裁切变形：

| 类型 | 来源 |
|---|---|
| 电影 / 电视剧 / 纪录片 / 动漫 | TMDB 海报 `https://image.tmdb.org/t/p/w500/<path>.jpg` |
| 游戏 | Steam 竖版封面 `https://cdn.cloudflare.steamstatic.com/steam/apps/<appid>/library_600x900_2x.jpg` |
| 软件 | Mac App Store 官方图标（512×512），用 `sharp` 合成 600×900（浅灰底 + 图标居中 + 底部标注） |
| 查不到图 | 不填 `image`（或填 `placeholder.svg`），构建自动生成并回退到 `/img/placeholder.svg` |

## 新增资源

> **顺序不能反：先给网盘目录编号重命名 → 再出共享链接 → 最后写 YAML。**
> 新增资源一律按该分类现有编号接续命名（`02应用` 里已有 `001-`、`002-`，新的就是 `003-xxx`、`004-xxx`）。
> **未编号的目录不要直接出链**：重命名会改变分享标题，重命名后重新出链拿到的 URL 也会变，先出链等于白做一遍。
> 重命名用夸克 CLI 的 `rename`（批量提交，1 小时内可撤回）。

**单条 · 交互式**

```bash
npm run new          # 逐项询问，按分类写入 data/<分类>.yaml
npm run build
```

**单条 · 直接改 YAML**，然后 `npm run build`。

**批量 · 从夸克网盘目录一次性出链**（几十上百条时用）：列目录 → 批量生成公开永久链接 → 抓 TMDB 中文信息（标题、简介、评分、海报）→ 写入 YAML → 构建。这套流程已固化为 skill **`~/.workbuddy/skills/quark-resource-sync/`**，直接说「同步夸克资源」即可触发：

```bash
node ~/.workbuddy/skills/quark-resource-sync/scripts/scan-new.mjs --out /tmp/scan.json   # 扫未编号目录、算下一编号、标疑似重复
node ~/.workbuddy/skills/quark-resource-sync/scripts/match-batch.mjs --scan /tmp/scan.json --out /tmp/match.json
node ~/.workbuddy/skills/quark-resource-sync/scripts/process-batch.mjs --init --scan /tmp/match.json --only mv --start 241 --plan /tmp/plan.json
node ~/.workbuddy/skills/quark-resource-sync/scripts/process-batch.mjs --plan /tmp/plan.json --size 20   # 编号→出链→抓信息→海报→写 YAML
```

配置（token / 代理 / 仓库路径 / 网盘 fid）集中在 skill 的 `config.env`。规则：疑似重复先问再动，不自动删。

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
| `/` | 首页（首屏 `pageSize` 条静态渲染，其余由「加载更多」渲染） |
| `/category/<分类>/` | 分类页 |
| `/resource/<id>/` | 详情页 |
| `/search-index.json` | 全站搜索索引，首次搜索时按需加载 |
| `/img/<id>-240.webp` `-180.webp` `-60.webp` | 卡片 / 详情页 / 缩略图 |
| `/img/placeholder.svg` | 缺图时的占位图 |
| `/qr/<id>-<网盘>.svg` | 构建期预生成的二维码 |
| `/favicon.svg` `/favicon.ico` `/apple-touch-icon.png` | 站点图标（由 `static/favicon.svg` 生成，未装 sharp 时只有 SVG 版） |
| `/sitemap.xml` `/robots.txt` `/404.html` | SEO 与兜底 |
| `/stats.json` | 访问统计（由 VPS 上的 `sitestats.py` 生成，经 Nginx 映射暴露，不由构建产出） |

改了卡片尺寸等图片参数后需 `rm -rf public && npm run build`。

## 部署

产物是纯静态文件，任何能托管静态文件的地方都能跑：

| 方案 | 适合 | 说明 |
|---|---|---|
| **VPS + Nginx + git 自动更新**（本站在用） | 面向国内用户、要绑域名、要备案 | 完全可控，SEO 与访问速度最好，成本约 20～50 元/月 |
| GitHub Pages | 免费、不想管服务器 | 国内访问不稳定，自定义域名不支持备案 |
| Cloudflare Pages | 免费、海外访问快 | 同上，国内偶发不通 |
| 对象存储 + CDN | 国内且量大 | 需备案，配置最繁琐 |

### 方案 A：VPS + Nginx + 自动更新（当前线上方案）

```
本机改动 → git push main
              ↓（cron 每 30 分钟）
VPS /opt/ShareResource: git fetch → 有新提交才 reset --hard → npm install
              → BASE_URL=https://www.wodewangpan.top npm run build → systemctl reload nginx
```

服务器为 Ubuntu 22.04，站点目录 `/opt/ShareResource`，Nginx `root /opt/ShareResource/public`。

**首次搭建**

```bash
# 1) 装环境
sudo apt update && sudo apt install -y nginx
sudo git clone https://github.com/linuxhobby/ShareResource.git /opt/ShareResource
cd /opt/ShareResource && npm install

# 2) Nginx：把 nginx.conf.example 的域名换成自己的
sudo sed 's/your-domain.com/你的域名/g' nginx.conf.example | sudo tee /etc/nginx/conf.d/share-resource.conf
sudo nginx -t && sudo systemctl reload nginx

# 3) HTTPS
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d 你的域名
```

Nginx 关键配置（完整文件见 `nginx.conf.example`）：

| 配置 | 作用 |
|---|---|
| `root /opt/ShareResource/public` | 指向 `public/` 的内容，不是 `public` 本身 |
| `try_files $uri $uri/ $uri/index.html =404` | 让 `/resource/mv-010/` 这类目录式 URL 命中 `index.html` |
| `error_page 404 /404.html` | 走站内 404 页 |
| 静态资源 `expires 30d`、HTML 不缓存 | 更新即时生效，图片不重复拉取 |

**自动更新脚本**（`/usr/local/bin/`）

| 脚本 | 作用 |
|---|---|
| `site-autoupdate` | cron 调用：`git fetch` 比对 HEAD，**有更新才** 构建 + reload nginx；无更新直接退出 |
| `rebuild-site` | 手动强制更新：`git pull` → 构建 → reload → 推送 IndexNow |
| `submit-baidu` | 把 sitemap 全部 URL 推给百度（token 放 `/opt/seo/baidu_token`） |
| `submit-indexnow` | 按 100 条一批推给 IndexNow（密钥放 `/opt/indexnow/key`） |

```bash
*/30 * * * * /usr/local/bin/site-autoupdate >> /var/log/site-autoupdate.log 2>&1   # 检查更新，有更新才构建
*/5  * * * * /usr/local/bin/sitestats.py    >> /var/log/sitestats.log 2>&1         # 访问统计增量
0    3 * * * /usr/local/bin/submit-indexnow                                        # 每天推送新 URL 给搜索引擎
```

> 仓库里的 `.github/workflows/` 已移除：部署只由上述 cron 完成，不再跑 GitHub Actions。

查看运行结果：`tail -20 /var/log/site-autoupdate.log`。

**回滚**：在 VPS 上 `git reset --hard <上一个 commit>` 再 `rebuild-site`；或本机 `git revert` 后推上去。

### 方案 B：rsync 直传（不经 GitHub）

```bash
BASE_URL=https://你的域名 \
REMOTE_USER=root REMOTE_HOST=你的服务器 REMOTE_DIR=/var/www/share-resource \
npm run deploy
```

`rsync --delete` 会清掉服务器上已删除的资源页。

### 方案 C：GitHub Pages

仓库 Settings → Pages → Source 选 **GitHub Actions**，新建 `.github/workflows/deploy.yml`：

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
      - run: BASE_URL=https://<用户名>.github.io/<仓库名> npm run build
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

### 方案 D：Cloudflare Pages

| 项 | 值 |
|---|---|
| Framework preset | None |
| Build command | `BASE_URL=https://<项目名>.pages.dev npm run build` |
| Build output directory | `public` |
| 环境变量 | `NODE_VERSION` = `20` |

## 访问统计（本地，不依赖第三方）

站点是纯静态，但访问量统计完全自建：Nginx 记日志 → 脚本增量解析 → 输出 JSON → 前端读取。

```
浏览器请求 → Nginx（sitestats 日志格式，末尾追加 $cookie_vid）
           → cron 每 5 分钟跑 sitestats.py
           → SQLite 累计（/var/lib/sitestats/stats.db）
           → 输出 /var/lib/sitestats/stats.json → 页脚 fetch 填充数字
```

**服务端三件套**

| 文件 | 作用 |
|---|---|
| `tools/sitestats.py` | 统计脚本，部署到 VPS 的 `/usr/local/bin/sitestats.py` |
| `/etc/nginx/conf.d/00-sitestats.conf` | 定义 `log_format sitestats`（combined 末尾加 `$cookie_vid`），需排在站点配置之前加载 |
| `/etc/nginx/conf.d/share-resource.conf` | `access_log … sitestats;` + `location = /stats.json` 映射 |

Nginx 关键两处：

```nginx
access_log /var/log/nginx/access.log sitestats;   # 站点 server 块内

location = /stats.json {
    alias /var/lib/sitestats/stats.json;
    default_type application/json;
    add_header Cache-Control "no-store";
}
```

**统计口径**

| 指标 | 规则 |
|---|---|
| PV | GET/HEAD 且状态码 <400；排除爬虫 UA（bot / spider / curl / wget / python-requests 等）与非页面路径（图片、CSS/JS、`404.html`、`robots.txt`、`sitemap.xml`） |
| UV | **只统计带 `vid` cookie 的请求**：cookie 由页面 JS 种植，跑过 JS 才算真人；爬虫 / 扫描器 / 预览抓取（UA 伪装成浏览器但不执行 JS）只计 PV 不计 UV |
| `/hit` 信标 | 页面 JS 种完 cookie 后回发 `POST /hit`（204 空响应），用来把「首访即走」的访客补进 UV；信标本身**不计入 PV** |
| 今日 | 按日志日期分组，每天 00:00 自动归零 |
| 增量 | 游标（inode + offset）存 SQLite 的 `meta` 表；logrotate 后自动从头读新文件，不重复计 |

**常用命令**

```bash
python3 /usr/local/bin/sitestats.py              # 手动跑一次增量（cron 每 5 分钟自动执行）
python3 /usr/local/bin/sitestats.py --backfill   # 从当前 access.log 开头全量回填
python3 /usr/local/bin/sitestats.py --file /var/log/nginx/access.log.1   # 回填指定日志
python3 /usr/local/bin/sitestats.py --reset      # 清空并从当前时刻起算，不回填
cat /var/lib/sitestats/stats.json                # {"pv":…,"uv":…,"today_pv":…,"today_uv":…}
```

前端部分在 `scripts/lib/render.js` 的 `LOCAL_STATS_HTML` / `LOCAL_STATS_SCRIPT`：种 `vid` cookie + `fetch('/stats.json')` 填四个数字；接口不可用时保持占位符 `–`，页面不受影响。想换回第三方，把 `data/site.yaml` 的 `stats` 改成 `busuanzi` 即可。

## 上线自检

```bash
S=https://www.wodewangpan.top
for u in / /category/%E7%94%B5%E5%BD%B1/ /resource/mv-010/ /sitemap.xml \
         /robots.txt /search-index.json /img/mv-010-240.webp /qr/mv-010-quark.svg \
         /stats.json /nope; do
  printf '%-38s %s\n' "$u" "$(curl -s -o /dev/null -w '%{http_code}' "$S$u")"
done
```

除 `/nope` 应为 **404**，其余全部 **200**（`/stats.json` 需 VPS 部署了 `sitestats.py` 才是 200，本机预览时为 404 属正常）。再确认源码里 canonical 是真实域名：`curl -s $S/ | grep canonical`。

首次上线把 `sitemap.xml` 提交到 Google Search Console 与百度站长平台；之后 `submit-baidu` / `submit-indexnow` 会自动推送。

### 常见故障

| 现象 | 原因 |
|---|---|
| 全部页面 404 | `root` 指到了 `public` 本身，应指向它的内容 |
| `/resource/mv-010/` 404 但文件存在 | `try_files` 少了 `$uri/index.html` |
| 页面无样式 | 检查产物里是否有 `public/assets/` |
| canonical / sitemap 是 `example.com` | 构建时漏了 `BASE_URL` |
| 中文分类页 curl 404 | 浏览器正常即可；curl 需 percent-encoding（`%E7%94%B5%E5%BD%B1`） |
| 配图 / 二维码 404 | 缺图时回退占位图，检查 `static/images/<id>.jpg` 是否存在 |
| 页脚统计一直是 `–` | `/stats.json` 未部署或没映射：`curl -I https://域名/stats.json`、`tail /var/log/sitestats.log` |
| 统计数字不再增长 | cron 任务丢失或日志被轮转：`crontab -l`、`ls -l /var/lib/sitestats/` |
| cron 没生效 | `crontab -l` 看任务在不在，`tail /var/log/site-autoupdate.log` 看输出 |
| 改了样式线上没变 | 浏览器缓存了旧 CSS（Nginx 对 css/js 设 30 天缓存）。构建会给资源加 `?v=<commit>`，每次部署 URL 自动变；仍不生效就强刷一次 |

## 调整首页观感

| 想改什么 | 改哪里 |
|---|---|
| 每行卡片数 | `theme/assets/style.css` 的 `.grid { grid-template-columns: repeat(5, …) }` 及各断点 |
| 首屏条数 | `data/site.yaml` 的 `pageSize` |
| 卡片标题 / 日期字号 | `.tile__title`（16px）、`.tile__meta`（14px） |
| 顶栏品牌字号 | `.top__brand`（桌面 30px、≤640px 时 16px）；同步调 `.top__inner` 高度与 `.top__logo` 尺寸 |
| 「最新」角标数量 | `scripts/lib/render.js` 的 `NEWEST_BADGE`，与 `theme/assets/app.js` 的 `NEWEST` 保持一致 |
| 卡片尺寸 | `scripts/lib/assets.js` 的 `CARD = { w: 240, h: 360 }`（改后需 `rm -rf public && npm run build`） |

## 站内搜索

顶栏搜索框，纯前端、输入即时出结果：

- **拼音**：`taikong`、`tkbd` 都能搜到「太空部队」（构建期用 `pinyin-pro` 生成全拼与首字母，产物只存字符串）
- **相关度排序**：标题完全匹配 100 > 前缀 60 > 包含 40 > 全拼 30/18 > 首字母 26/14 > 标签 22 > 简介 12；多词为「与」关系
- **命中高亮**：标题命中词用 `<mark>` 标出
- **防抖 120ms**，结果最多 120 条
- **快捷键**：`Ctrl/⌘ + K` 或 `/` 聚焦，`Esc` 清空
- **URL 同步**：搜索时地址栏变成 `/?q=关键词`，可直接分享

## SEO

构建时自动生成，无需手工维护：

| 项目 | 说明 |
|---|---|
| `title` / `description` | 每页独立；详情页「标题 - 站名」，描述取简介前 160 字 |
| 首页文案 | `site.yaml` 的 `homeTitle` / `homeDesc` / `homeH1`，支持 `{total}`、`{categories}` 占位符，构建时自动替换；分类页用分类名，不受影响 |
| `canonical` | 每页指向自身绝对地址，避免 `/index.html` 与 `/` 重复 |
| OG / Twitter Card | `og:title` / `og:description` / `og:image` / `og:url` |
| JSON-LD | 详情页 `Movie` / `TVSeries`（按分类）+ 面包屑；列表页 `WebSite`（含 SearchAction）+ `CollectionPage` |
| `sitemap.xml` | 首页 + 分类页 + 全部详情页，带 `lastmod` 与优先级 |
| `robots.txt` | 全站开放，并声明 sitemap 地址 |
| 性能 | 首屏前 5 张图 `eager + fetchpriority=high`（LCP），其余懒加载 |

## 实现要点

- 静态资源带版本号：`/assets/style.css?v=<commit>`，Nginx 缓存 30 天也能在部署后立即取到新文件
- 二维码构建期生成 SVG 落盘，页面只引用静态图片
- 搜索纯客户端：列表页内联本页数据（离线可用），跨页搜索再拉 `search-index.json`
- 复制按钮用 `navigator.clipboard`，不支持时回退 `execCommand`
- 无登录、无评论、无广告、无动画；列表页宽容器 1180px，详情页 760px 居中
- `public/` 不入库（`.gitignore`），仓库只留源码与数据
