# wodewangpan · 网盘资源分享站

用 YAML 写资源，构建成**纯静态站点**：海报压缩、二维码、搜索索引、SEO 标签全部在构建期生成，产物丢给 Nginx 就能跑。无数据库、无后端、无登录。

| | |
|---|---|
| 网站 | https://www.wodewangpan.top |
| 仓库 | `git@github.com:linuxhobby/wodewangpan.git` |
| 更新方式 | 推到 `main`，VPS 每 60 分钟自动拉取并重建 |

## 网站特性

- **数据即内容**：一个分类一个 YAML，改完构建就出整站
- **构建期出图**：配图自动压成海报与缩略图两档，缺图时有分类占位海报兜底
- **二维码预生成**：静态 SVG，扫码转存不依赖 JS
- **纯前端搜索**：支持拼音与首字母，命中高亮，搜索结果可分享链接
- **SEO 全自带**：canonical、OG / Twitter Card、JSON-LD、sitemap、robots、404 兜底
- **内链自足**：全量索引页 `/all/` + 详情页「相关推荐」，不执行 JS 也能从任一页走到全部资源
- **响应式宫格**：窄屏自动减列，手机到桌面都能看
- **首屏即读**：列表页首屏内容内联进 HTML，禁用 JS 也能正常浏览
- **访问统计自备**：解析 Nginx 日志得到访问数据，不依赖第三方统计

## 网站部署

产物是纯静态文件，任何能托管静态文件的地方都能跑。挑一种照着做即可：

| 方式 | 适合 | 说明 |
|---|---|---|
| **A · VPS + Nginx**（推荐，本站线上方案） | 有域名、有VPS主机 | 完全可控，SEO 与访问速度最好 |
| B · GitHub Pages | 免费、不想管服务器 | 国内访问不稳定 |
| C · Cloudflare Pages | 免费、海外快 | 同上，国内偶发不通 |

前置：Node ≥ 18（VPS 方案另需 Nginx、Git，Python 3 只在用访问统计时需要）。

### 方案 A：VPS + Nginx

站点目录 `/opt/wodewangpan`；下面命令走 `apt`，Debian / Ubuntu 都能照抄。

**1）装环境**

```bash
sudo apt update && sudo apt install -y nginx git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
node -v   # 需 ≥ 18
```

**2）取代码、装依赖**

```bash
sudo git clone https://github.com/linuxhobby/wodewangpan.git /opt/wodewangpan
cd /opt/wodewangpan && sudo npm ci
```

> `sharp` 可选（`npm i sharp`）：负责压缩与裁切，没装就按原图复制，产物体积会大很多。

**3）改成你自己的站点**

编辑 `data/site.yaml`：`title` / `description` 站名站描述、`categories` 分类栏、`contact` 页脚联系方式、`icp` 备案号；`static/favicon.svg` 换成你的图标。

改完站点配置后，顺手重跑一次 `node tools/share-poster.mjs`，它会按新的站名与分类重新生成首页品牌分享卡 `static/share.jpg`（不重跑则沿用旧图）。

资源数据直接改 `data/<分类>.yaml`（格式见 [数据格式](#数据格式)），或先跑通流程后再替换。

**4）构建**

```bash
BASE_URL=https://你的域名 npm run build     # 必填，否则 canonical / OG / sitemap 会指向 example.com
```

产物在 `public/`。

**5）配置 Nginx**

```bash
sudo install -m644 deploy/nginx-site.conf.example /etc/nginx/conf.d/wodewangpan.conf
sudo sed -i 's/your-domain.com/你的域名/g' /etc/nginx/conf.d/wodewangpan.conf
sudo nginx -t && sudo systemctl reload nginx
```

Nginx 关键三处（示例文件里都有，不用手改）：

| 配置 | 作用 |
|---|---|
| `root /opt/wodewangpan/public` | 指向 `public/` 目录本身 |
| `try_files $uri $uri/ $uri/index.html =404` | 让 `/resource/mv-010/` 命中目录下的 `index.html` |
| `error_page 404 /404.html` | 走站内 404 页 |

**6）HTTPS**

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx --redirect -d 你的域名 -d www.你的域名
```

`-d` 写两个名字，证书同时覆盖裸域与 www；`--redirect` 让 certbot 自动把 80 端口改成 301 跳 https（并保留 acme 校验路径），省得手工改。签完再按 `deploy/nginx-site.conf.example` 里的第 2 段把裸域 https 也 301 到 www——全站只留 `https://www.<域名>/` 一个 200，搜索引擎才不会把 http / https、裸域 / www 各收一份。

**7）验证**

打开 `https://你的域名`，再跑一遍 [上线自检](#上线自检)。

**8）自动更新（可选，强烈建议）**

推到 `main` 后服务器自动拉取、重建、reload nginx：

```bash
sudo install -m755 deploy/site-autoupdate.sh /usr/local/bin/site-autoupdate

# 站点专属的两个值放 /etc/site-autoupdate.conf，与脚本本身分开，
# 以后脚本升级只要重新 install 一次，配置不会丢
sudo tee /etc/site-autoupdate.conf >/dev/null <<'EOF'
SITE_DIR=/opt/wodewangpan
BASE_URL=https://你的域名
EOF

sudo crontab -e
# 加入一行（每小时拉取一次；要更快就把第一个字段改成 */30，即每 30 分钟）
0 * * * * /usr/local/bin/site-autoupdate >> /var/log/site-autoupdate.log 2>&1
```

看运行结果：`tail -20 /var/log/site-autoupdate.log`。

**想立刻发布、不等 cron**：服务器上执行 `FORCE=1 site-autoupdate`（cron 模式下本地 HEAD 与远端一致时会直接跳过，FORCE 用来强制重跑一次）。

**回滚**：服务器上 `git reset --hard <上一个 commit>` 再 `FORCE=1 site-autoupdate`，或本机 `git revert` 后推上去。

发布过程是原子的：先构建到临时的 `public.new`，全部就绪后才用两次 `mv` 换成 `public`，nginx 始终读到一个完整版本的产物，不会出现「新 HTML 配旧 CSS」这种中间态。

**9）访问统计（可选）**

```bash
sudo install -m755 tools/sitestats.py /usr/local/bin/sitestats.py
sudo install -m644 deploy/00-sitestats.conf /etc/nginx/conf.d/00-sitestats.conf
sudo mkdir -p /var/lib/sitestats
sudo crontab -e
# 加入一行：
*/5 * * * * /usr/local/bin/sitestats.py >> /var/log/sitestats.log 2>&1
```

`data/site.yaml` 里保持 `stats: local` 即可；不想统计就删掉这段（页脚数字留空）。已签发证书后 Nginx 配置里的 `access_log ... sitestats;` 才会生效，reload 一次：`sudo nginx -t && sudo systemctl reload nginx`。

### 方案 B：GitHub Pages

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

### 方案 C：Cloudflare Pages

| 项 | 值 |
|---|---|
| Framework preset | None |
| Build command | `BASE_URL=https://<项目名>.pages.dev npm run build` |
| Build output directory | `public` |
| 环境变量 | `NODE_VERSION` = `20` |

### 上线自检

```bash
S=https://你的域名
for u in / /category/movie/ /all/ /resource/mv-010/ /sitemap.xml \
         /robots.txt /search-index.json /img/mv-010-240.webp /qr/mv-010-quark.svg \
         /nope; do
  printf '%-38s %s\n' "$u" "$(curl -s -o /dev/null -w '%{http_code}' "$S$u")"
done
curl -s $S/ | grep canonical       # 应是你的真实域名
```

除 `/nope` 应为 **404**，其余全部 **200**。中文分类页用 curl 要 percent-encoding，浏览器直接访问正常。

### 提交给搜索引擎

| 方式 | 做法 |
|---|---|
| **1 · Google Search Console** | 添加站点 → 左侧「站点地图」提交 `https://你的域名/sitemap.xml`（首次验证一次即可） |
| **2 · 百度站长平台** | 同上提交 sitemap；更快的是「普通收录 → API 推送」：token 存为 `/opt/seo/baidu_token`，用 `submit-baidu` 推送 |
| **3 · IndexNow（实时推送，技术方式）** | 向 **Bing** 等参与引擎实时递交：站点放一个密钥文件，脚本取 sitemap 里**有变化的 URL** 分批 POST 给 IndexNow，新页面几分钟内被 Bing 发现 |

方式 3 配置（脚本见 `deploy/submit-indexnow.sh`）：

```bash
# 1) 生成密钥，放到站点可访问的位置
sudo mkdir -p /opt/indexnow && openssl rand -hex 16 | sudo tee /opt/indexnow/key.txt

# 2) Nginx 暴露密钥（deploy/nginx-site.conf.example 已含该段）
#    location = /key.txt { alias /opt/indexnow/key.txt; default_type text/plain; }
sudo nginx -t && sudo systemctl reload nginx
curl -s https://你的域名/key.txt     # 应返回那串密钥

# 3) 安装脚本并立即递交一次（首次全量，之后每天增量）
sudo install -m755 deploy/submit-indexnow.sh /usr/local/bin/submit-indexnow
sudo sed -i 's/www.your-domain.com/你的域名/' /usr/local/bin/submit-indexnow
sudo ALL=1 /usr/local/bin/submit-indexnow
tail -3 /var/log/submit-indexnow.log    # 首次全量：本站 595 条 URL：成功 595，失败 0

# 4) 每天自动推（root crontab）：默认只推 sitemap 里 lastmod >= 昨天的 URL
0 3 * * * /usr/local/bin/submit-indexnow >> /var/log/submit-indexnow.log 2>&1
```

只推变化的 URL 是刻意的：IndexNow 官方建议仅在内容新增 / 变更时提交，天天全量推没有额外收益。要补推就 `ALL=1` 或 `SINCE=2026-10-01 submit-indexnow`；当天没有变更时脚本会写一条「无新增或变更」并直接退出，不会空推。

方式 2 的 API 推送同样可以脚本化（脚本见 `deploy/submit-baidu.sh`）：

```bash
# 1) 百度站长平台完成站点验证后，从「普通收录 → API 提交」拿到 token
echo '你的token' | sudo tee /opt/seo/baidu_token && sudo chmod 600 /opt/seo/baidu_token

# 2) 安装脚本并立即推一次
sudo install -m755 deploy/submit-baidu.sh /usr/local/bin/submit-baidu
sudo sed -i 's#www.wodewangpan.top#你的域名#g' /usr/local/bin/submit-baidu
sudo /usr/local/bin/submit-baidu
tail -3 /var/log/submit-baidu.log

# 3) 每天自动推（root crontab）
10 3 * * * /usr/local/bin/submit-baidu
```

> 百度按站点发放每日配额（新站通常只有几十条/天）。脚本会先探测当天剩余配额再分批推送，推不完的次日自动续上，已推送过的 URL 记录在 `/var/lib/baidu-submitted.txt` 不会重复提交。配额随站点抓取量提升，建议同时在站长平台手动提交一次 sitemap 作为兜底。

实测：595 个 URL（586 条资源 + 首页 + 8 个分类页）按每批 50 条分 12 批提交，全部返回 200/202。

## 目录结构

```
data/                # 一个分类一个 YAML（英文文件名），构建时自动合并
  site.yaml          # 站名、分类顺序、免责声明、页脚联系方式、首屏条数
  movie.yaml         # 电影
  tv.yaml            # 电视剧
  documentary.yaml   # 纪录片
  anime.yaml         # 动漫
  game.yaml          # 游戏
  software.yaml      # 软件
  os.yaml            # 操作系统
  ebook.yaml         # 电子书
  misc.yaml          # 其他
static/
  favicon.svg        # 站点图标唯一源文件（换 logo 就改它）；构建时拷到根目录并生成 favicon.ico / apple-touch-icon.png
  share.jpg          # 首页品牌分享卡（1200×630），构建时拷到站点根目录供 og:image 用
  images/            # 配图，文件名与资源 id 对应：<id>.jpg / .png / .webp / .svg
theme/assets/        # 前端样式与脚本，构建时拷到 public/assets/
scripts/             # 构建 / 预览脚本（lib/ 是构建核心：读数据、出图片、渲染页面）
tools/
  sitestats.py           # 访问统计脚本（VPS 方案用到）
  share-poster.mjs       # 生成首页品牌分享卡 static/share.jpg（改站点配置后重跑）
  fill-desc.mjs          # 把 .tmp/desc-draft.json 里的简介写回 YAML（自动接回【季/集】前缀与 ｜TMDB 后缀，--strict 拦不合格稿）
  list-short-desc.mjs    # 列出正文不足指定字数的条目（npm run list:short，默认 120 字）
  icon-poster.mjs        # 把应用图标合成 2:3 竖版海报（软件 / 音频等非影视资源）
  book-cover-douban.mjs  # 从豆瓣图书抓书籍封面（电子书 bk- 优先用它，见「经验总结」）
  book-poster.mjs        # 豆瓣查无此书时，生成书封海报兜底
  set-poster.mjs         # 套装 / 合辑专用深色封面（豆瓣没有对应单册封面时用，见「经验总结」）
deploy/              # 部署用：Nginx 配置示例、自动更新脚本、统计日志格式、搜索引擎提交脚本
public/              # 构建产物，部署这个目录（586 条时约 17MB，不入库）
```

## 站点配置 `data/site.yaml`

```yaml
title: 我的网盘资源站
description: 夸克 / 百度网盘资源索引，打开即用，扫码即存
# 首页 SEO 文案（可选，不填则回退用站名与站描述）；{total} = 资源总数，{categories} = 分类列表
homeTitle: 我的网盘资源站 - 夸克/百度网盘资源索引   # 构建时自动追加「（586 项）」
homeDesc: 夸克 / 百度网盘资源索引，收录 {total} 个{categories}资源，打开即用，扫码即存
homeH1: 网盘资源索引 · 全部资源                 # 首页 H1（分类页仍用分类名）
disclaimer: 本站仅提供网盘资源索引，所有文件均存放于第三方网盘…
categories: [电影, 电视剧, 纪录片, 动漫, 游戏, 软件, 电子书, 其他]   # 分类栏顺序；未列出的按资源数倒序追加在末尾
contact:                             # 页脚联系方式（可选，留空不显示）
  email: "you@example.com"            # 目前只支持邮箱，页面上显示为一个信封图标
icp: ""                              # 备案号，留空不显示
stats: local                         # 页脚统计：local = 本地（读服务端 /stats.json）｜留空不显示
pageSize: 35                         # 首屏渲染条数；构建时内联前 pageSize × 2 条，其余由「加载更多」按需补齐
```

联系方式在页面上只显示为一个信封图标（2026-10-08 起页脚只留邮箱，Twitter / Telegram 分支已从 `render.js` 删除，写上也不生效），地址写在 `title` 与 `aria-label` 里。`stats: local` 依赖服务器上的 `/stats.json`，本机预览时数字显示占位符 `–`，属正常。

## 页面形态

| 页面 | 形态 |
|---|---|
| `/` | 首页宫格，**按 `added` 倒序（最新加入在前）**，`added` 带到时分时精确到入库先后；最前 6 条带「最新」角标 |
| `/category/<分类>/` | 同样的宫格，只含该分类 |
| `/resource/<id>/` | 240×360 海报（与列表宫格卡片同图同尺寸）+ 二维码（最多 3 个网盘链接各一张）+ 网盘链接与复制按钮 + 6 条「相关推荐」 |
| `/all/` | 全部资源索引：593 条链接按分类平铺成纯 HTML，不依赖 JS，蜘蛛一次抓取即可走完全站 |
| 搜索 | 顶栏即时搜索（`Ctrl/⌘ + K` 聚焦），结果同样宫格呈现，命中词高亮 |

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
  description: 4K 国语中字   # 可选，详情页正文，上限 1200 字（超出构建时自动截断）
  date: 2013-01-30          # 可选，上映 / 发行日期
  added: "2026-10-07 17:40" # 可选，加入时间，决定排序（不填则排最前）；带时分能精确到入库时刻，必须加引号
  image: mv-010.jpg         # 可选，默认取 static/images/<id>.<ext>
```

**排序**：`added` 倒序（写到时分按实际时刻，只写日期的按当天 00:00）→ 同刻按 id 编号倒序 → `date` 倒序 → 文件内原序。

**简介（`description`）**：影视类条目**不得照抄 TMDB 原文**，要二次加工，且正文不低于 300 字（上限 1200 字，超出构建时截断）。完整规则见 [经验总结](#剧情简介别照抄-tmdb正文不低于-300-字)。

内置网盘字段：`quark_url`、`baidu_url`、`aliyun_url`、`tianyi_url`、`uc_url`、`xunlei_url`、`115_url`、`mobile_url`，提取码为对应 `xxx_code`。多个链接时详情页全部列出。其它网盘用通用写法：

```yaml
  links:
    - name: 迅雷网盘
      url: https://pan.xunlei.com/s/xxxx
      code: ab12
```

**id 规则**：`mv-` 电影、`tv-` 电视剧、`dc-` 纪录片、`an-` 动漫、`game-` 游戏、`app-` 软件、`os-` 操作系统、`bk-` 电子书、`ot-` 其他，后接三位编号，与 `static/images/` 里的配图同名。

**新增一个分类**：建 `data/<英文名>.yaml`（建议缩写，中文文件名在 Git 与命令行里会变成转义串），把分类名加进 `site.yaml` 的 `categories`，`npm run build` 即可。

### 配图规范

统一 **2:3 竖版**，源图宽度不低于 480（构建时统一裁成海报 240×360 与缩略图 60×90 两档），卡片不会裁切变形：

| 类型 | 来源 |
|---|---|
| 电影 / 电视剧 / 纪录片 / 动漫 | TMDB 海报 `https://image.tmdb.org/t/p/w500/<path>.jpg`（500×750） |
| 游戏 | Steam 竖版封面 `https://cdn.cloudflare.steamstatic.com/steam/apps/<appid>/library_600x900_2x.jpg` |
| 软件 | 应用商店官方图标，用 `tools/icon-poster.mjs` 合成 480×720，做法见 [经验总结](#经验总结) |
| 操作系统 | 各发行版 / 系统官方标志（Windows、Ubuntu、Debian、Fedora 等都有公开 logo），同样用 `tools/icon-poster.mjs` 合成 480×720 |
| 其他（音频 / 课程等） | 没有官方图标来源，同样用 `tools/icon-poster.mjs` 合成 480×720（拿品牌图标或自绘线条图标） |
| 电子书 | 豆瓣图书封面，用 `tools/book-cover-douban.mjs` 抓取（约 500×750），做法见 [经验总结](#经验总结) |
| 电子书（套装 / 合辑） | 豆瓣没有对应单册封面，用 `tools/set-poster.mjs` 自制 480×720 深色封面，见 [经验总结](#经验总结) |
| 查不到图 | 不填 `image`，构建自动回退分类占位海报（见 [经验总结](#经验总结)） |

## 新增资源

本地跑起来看效果：

```bash
npm install
npm run build                                   # 构建到 public/
npm run serve                                   # 本地预览 http://localhost:4321
BASE_URL=https://你的域名 npm run build          # 正式构建必带域名
npm run dev                                     # build + serve 一步到位
npm run audit:css                               # 样式体检：漏样式 / 死样式 / 写死数值（改完 CSS 建议跑一次）
```

三种方式加资源：

1. **交互式**：`npm run new`，逐项询问后按「分类 → 英文文件名」写入 `data/`（如 电影 → `movie.yaml`）
2. **直接改 YAML**，然后 `npm run build`
3. **批量**：先把网盘目录编号重命名，再出公开永久链接，然后按格式批量写 YAML

> 顺序不能反：先给目录编号重命名 → 再出分享链接 → 最后写 YAML。重命名会改分享标题，先出链等于白做。

**改动后**：`npm run build` → 本地 `npm run serve` 看效果 → 推到 `main`（VPS 方案会自动更新）。

改了配图尺寸参数不必手动清产物：构建时会按当前宽度集合自动清理上一版留下的旧尺寸图片。

## 经验总结

日常维护里踩过、值得记住的几条经验，涉及配图、分类与简介文案。

### 电子书封面：抓豆瓣正版封面

`tools/book-poster.mjs` 能生成凑合看的书封（渐变底 + 书本图形 + 书名），但同一批书做出来只有颜色不一样、几乎分不出是哪本。**优先抓出版社的正版封面**：

```bash
node tools/book-cover-douban.mjs --title "牧羊少年奇幻之旅" --out static/images/bk-002.jpg
node tools/book-cover-douban.mjs --title "飞越疯人院" --author "肯·克西" --out static/images/bk-001.jpg
node tools/book-cover-douban.mjs --title "强风吹拂" --pick 26210487 --out static/images/bk-004.jpg
node tools/book-cover-douban.mjs --title "肖申克的救赎" --list        # 只看候选，不下载
```

豆瓣没有开放 API（Google Books 全天 429 配额耗尽、Open Library 本机连不通），脚本走的是图书搜索页：

| 步 | 做法 |
|---|---|
| 搜索 | `book.douban.com/subject_search?search_text=<书名>`，页面内嵌 `"items": [...]` JSON，含 `title` / `abstract`（作者 · 译者 · 出版社 · 年份）/ `cover_url` / `id` |
| 取大图 | 封面地址把 `/m/public/` 换成 `/l/public/`，得到约 500×750 的封面，正好是站点要的 2:3 |
| 反爬 | 请求**必须带**浏览器 UA 与 `Referer: https://book.douban.com/`，否则返回 418 / 403；请求过密会间歇返回空结果，脚本内置了间隔与重试 |

四个实测踩过的坑：

1. 别用 `/j/subject_suggest?q=` 这个简化接口，索引不全，《飞越疯人院》就搜不到，要用上面的搜索页。
2. 同一书名往往有多个版本（不同出版社 / 年份 / 译本），用 `--author` 给作者关键字，或先 `--list` 看好再 `--pick <豆瓣条目id>` 指定。
3. **有些条目的封面是「封面+封底」展开图**（《飞越疯人院》2015 重庆版就是），放进卡片会被裁得莫名其妙。**入库前务必把图打开看一眼**，是展开图就换一个版本。
4. 豆瓣查无此书（部分书目已下架）时，才退回 `tools/book-poster.mjs` 生成，不要留占位图。

### 电子书封面（二）：套装 / 合辑自制封面

套装在豆瓣上往往没有能用的封面：整个「套装」条目要么根本没图，要么就是封面 + 封底拼在一起的展开图（《斯蒂芬·金的王牌惊悚套装》共 17 册，就是这么个情况）。这时候用 `tools/set-poster.mjs` 自己排一张：

```bash
node tools/set-poster.mjs --kicker "STEPHEN KING" --prefix "斯蒂芬·金的" --title "王牌惊悚套装" \
  --badge "共 17 册" --label "COLLECTED WORKS" --formats "epub · mobi · azw3" \
  --author "[美] 斯蒂芬·金" --out static/images/bk-006.jpg
```

版式固定为「顶部拉丁字母 → 小字前缀行 → 主标题 → 册数徽标 → 底部拉丁字母 → 格式 → 作者」，每一项都可以缺省（不给就不画，位置留白）；主标题字号随字数自动收缩（≤5 字 58px、6 字 55px、8 字 48px、更长 42px），`--accent` 换主色（默认血红 `#c02222`，描边与徽标由它自动派生明暗档）。底色是近黑渐变 + 主色氛围光 + 扫描线 + 双线内框，和站内其它海报是一套观感。

三条经验：

1. 套装别拿 `tools/book-poster.mjs` 硬凑：那个工具画的是「一本书」的书脊图形，放在多册合辑上语义不对。
2. 主色只用一档，层次全靠透明度堆。第一版把红色氛围光做成大范围晕染，出图发糊，像背景沾了块污渍；收成书名背后的一小片光池，再把四角压暗，画面立刻干净。
3. **自制封面没有参考物可以对，出图一定要打开看一眼**再入库，别只看脚本打印的尺寸就提交。

### 软件配图：用 App Store 官方图标合成海报

软件 / 音频这类资源在 TMDB 上一定命中不了，别直接留占位图。做法是从 App Store 拿官方图标，再用 `tools/icon-poster.mjs` 合成 2:3 竖版海报：

```bash
# 1) 查图标（无需鉴权）：Mac 软件用 entity=macSoftware，iOS / 通用用 entity=software
curl -s "https://itunes.apple.com/search?term=AdGuard&entity=macSoftware&country=cn&limit=3"
# 结果里取 artworkUrl512（512×512）；别急着用，先比对 trackName / sellerName / bundleId

# 2) 合成海报
node tools/icon-poster.mjs --icon "<artworkUrl512>" --out static/images/app-005.jpg \
  --title "AdGuard" --sub "广告拦截 · 隐私保护" --c1 "#2f8f5b" --c2 "#7ccb95" --radius 22
```

| 参数 | 作用 |
|---|---|
| `--icon` | 图标，本地文件路径或图片 URL 都行 |
| `--title` / `--sub` | 海报上的应用名与一句话定位，都可省（不给就留白） |
| `--c1` / `--c2` | 背景渐变两端，默认墨绿；拿不准就用默认 |
| `--radius` | 图标圆角，按边长百分比；直角方形图标给 `22`，图标本身已带圆角就别加 |
| `--icon-size` | 图标边长，默认 300；源图小时调小，避免放大发糊 |

输出固定 480×720 JPEG，图标居中偏上，与站内其它海报同一套观感。

四条踩过的经验：

1. **别拿搜索结果第一条就用**：同一个词常回来好几个不相干的应用（搜 `AdGuard` 会混进 AdBlocker Pro、uBlock Origin Lite）。`limit` 给 3~5 条，比对 `trackName` / `sellerName` / `bundleId` 确认是同一个东西，再取 `artworkUrl512`。
2. 关键词宁短勿长：`Parallels Desktop 18` 带版本号经常搜不到，用 `Parallels Desktop` 再自己挑版本。`entity` 选错（Mac 应用去 `software` 里搜）会一无所获，两个都试一遍；`country=cn` 影响结果集与名称本地化。
3. 圆角只加一次：先打开 `artworkUrl512` 原图看一眼，图标本身已带圆角就不要再给 `--radius`，只有直角方形图标才加 `--radius 22`，加两层会看到明显的双圆角。
4. **出图必须打开看一眼再入库**：标题太长会顶到边、图标偏小、`--sub` 缺省时标题位置会下移，这些只有看图才发现。用 `sharp` 把结果转成 PNG 预览即可。批量补图（本站一次补过 49 / 51 条）时，合成完抽查几张卡片，别只看脚本打印的尺寸。

### 软件配图（二）：拿不到官方图标就自己画

上一节的官方图标这条路走不通时的兜底做法。Windows 工具类资源（驱动、激活工具、Office 部署器）常常在 iTunes / GitHub / 官网上都找不到像样的图标。这时候画一个 512×512 的白色线性图标（WiFi 信号、钥匙、下载箭头这类通用符号就够），交给 `tools/icon-poster.mjs` 合成海报（参数同上，`--title` / `--sub` / `--c1` / `--c2` 控制文字与配色），出来的观感和正版图标的海报是一套的，比塌落到占位图强得多。

中间还有一档可选：开源工具常能在 GitHub 上取到项目 / 组织头像当图标，`https://github.com/<org>.png?size=460` 直接取，别去猜组织的数字 ID，猜错会拿到完全不相干的头像。

### 新增分类：占位海报记得一起补

`scripts/lib/assets.js` 的 `CAT_STYLE` 目前收录 电影 / 电视剧 / 纪录片 / 动漫 / 游戏 / 软件 / 操作系统 / 其他 八个分类，每个配了渐变底色、徽章图标、专属底纹和英文副标题。**没收录的分类不会报错，但观感会塌一档**：按分类名派生色相，图标退回文件夹、底纹退回波浪、英文副标题留空（后加的 `电子书` 目前就是这种）。要补齐，在 `CAT_STYLE` 加一行（`c1` / `c2` / `icon` / `en` / `tex`），图标从 `ICONS` 里挑（`film` `tv` `globe` `bubble` `pad` `window` `disc` `folder`），不够就再加图标与底纹函数（`TEX`）。新增分类（如 2026-10-09 的 `操作系统`）记得顺手补上，否则新分类的占位海报一律是派生出来的文件夹样式。

缺图的回退顺序是：分类占位海报（`/img/placeholder-<分类>.svg`）→ 通用占位图（`/img/placeholder.svg`，只有分类未知时才走到）。曾有两条走占位图（`mv-240`、`app-080`），2026-10-08 已补齐，当前 0 条。

### 剧情简介：别照抄 TMDB，正文不低于 300 字

TMDB 的中文简介（`overview`）大多是简述式的一两句，直接写进 `data/*.yaml` 有两个毛病：与 TMDB、豆瓣等站点的正文高度雷同（不利于收录），信息量也撑不起详情页。所以影视类条目一律**二次加工**：

1. **改写，不是同义词替换**：事实全保留（人物、关系、核心冲突、类型、年代、产地），换掉叙述顺序与句式，把一句话带过的写法展开成完整段落。
2. **补料扩写**：素材从 TMDB detail 已返回的字段里取（类型、宣传语、上映年份、导演、主演、季数与集数、片长、产地），融进正文。**只陈述拿得到的事实，不编造情节**，宁可写短一点也不写没发生过的事。
3. **正文下限 300 字**：先剥掉正文前的 `【第 N 季 · 共 M 集】` 这类方括号标签，再剥掉结尾 `｜TMDB <评分>`，中间这段不少于 300 字，上限 1200 字。原文即使已超 300 字也要改写（目的就是不雷同），改完同样不得低于 300。
4. **结构与收尾**：开头一句点出类型与背景，中间展开人物与冲突，结尾落在看点或风格；电视剧先写季集标签；结尾照旧追加 `｜TMDB <评分>`，评分值不改。

**怎么落地**（沿用「建议优化」第 3 项的那条链路，达标线从 200 字提到 300 字）：

```bash
npm run list:short -- --max=300              # 列出正文不足 300 字的条目，按字数升序
npm run list:short -- --max=300 --cat=电影    # 只看某个分类
# 写好正文放进 .tmp/desc-draft.json（{ "mv-212": "新简介正文" }），再：
node tools/fill-desc.mjs                     # 空跑看改动
node tools/fill-desc.mjs --apply             # 真正写回 data/*.yaml（自动接回 ｜TMDB 评分后缀）
```

要按「剥掉 `【…】` 标签与 `｜…` 尾巴」的口径精确复核，用夸克同步 skill 里的只读脚本：

```bash
node ~/.workbuddy/skills/quark-resource-sync/scripts/check-desc.mjs     # 列出正文不足 300 字的条目
node …/check-desc.mjs --file movie.yaml                                 # 只看某一份数据
node …/check-desc.mjs --show                                            # 连正文一起打印，方便直接改写
```

存量改写进度见 [建议优化](#建议优化) 第 3 项：全站 591 条已按 200 字线全部达标（最短 200 字）。按 300 字新标准复核时，用上面的 `--max=300` 重新拉清单，改写完一批就构建 + 推送。

> 这些规范同时被夸克同步 skill 复用，改了要同步改 skill。

## SKILL 变更

本 README 的规范同时被夸克同步 skill 复用（位置 `~/.workbuddy/skills/quark-resource-sync/`），改这里的任一条都要同步改 skill 与仓库脚本。

## SEO建议优化

SEO 相关的建议、复核结论与执行记录写在这里。本节按「蜘蛛日志 → 关键发现 → 建议复核 → 已执行 → 待观察」组织：新建议先记在**建议复核**里并注明是否采纳，落地后搬进**已执行**，改了 robots / sitemap / 站点结构记得同步更新。

> 数据依据 VPS 保留访问日志（含轮转，覆盖近期）中各搜索引擎蜘蛛的**实际抓取记录**。统计口径：按 user-agent 归类，抓取次数 / 去重 URL / 页面类型 / 状态码。（截至 2026-10-09）

### 收录现状

| 蜘蛛 | 抓取次数 | 去重页面 | 抓到的页面构成 | 状态码 | 判断 |
|---|---|---|---|---|---|
| Googlebot | 831 | 162 | 首页 581 · 资源页 122 · 分类页 22 · 内部 JSON 63 · robots 33 · sitemap 5 | 200×761、**404×54**、301×16 | 已收录，面广但抓取偏科 |
| YandexBot | 567 | 514 | 资源页 514 · 首页 25 · robots 18 · 分类页 10 | 200 全绿 | 接近全站遍历，覆盖最深 |
| Baiduspider | 27 | 2 | 首页 23 · 验证文件 4 | 200×24、301×3 | 已验证但不进内容页 |
| bingbot | 10 | 7 | 首页 3 · robots 2 · sitemap 1 · stats.json 1 · 资源页仅 1 · key.txt 1 | 200×9 | 象征性到访，收 URL 不抓正文 |
| 360Spider | 4 | 1 | 仅首页（先 2×301 再 2×200） | 200×2、301×2 | 吃闭门羹，未入内容 |

搜狗（Sogou web spider）、字节（Bytespider）、华为（PetalBot）目前**零到访**。日志中另有 ClaudeBot / SemrushBot / AhrefsBot / Applebot，属 AI 爬虫与 SEO 工具，不计入搜索引擎收录指标。

### 关键发现

1. **Google 的 54 个 404 全浪费在内部接口上**：几乎全是它渲染页面后跟着去抓 `/resource/*/search-index.json`、`/category/*/search-index.json`。这些是前端搜索用的 JSON 端点，本来不存在，纯消耗抓取预算（实测是**硬 404**：nginx `error_page 404 /404.html` 不带 `=`，保留原状态码，不是软 404）。
2. **Google 抓取偏科**：首页被反复抓 581 次（占其配额约 70%），资源页只到 122 个——相对 Yandex 已遍历的 514 个，内容覆盖明显滞后。**主因不是首页 `lastmod`**（它每天变是因为每日热门真的入库了），而是下面第 5、6 条：首页能走的路只有 35 条。
3. **百度卡死**：`baidu_verify_codeva-*.html` 被爬到说明站长平台已验证通过，但百度蜘蛛一个资源 / 分类页都没进。结合站点现状看，这不是配置问题——站点 IP 在香港（腾讯云 `43.128.54.22`）且 `icp` 为空，境外 + 无备案在国内引擎这里基本拿不到配额与信任度。
4. **首页的 301 是合规的**：Google / Baidu / 360 都命中过首页 301。实测 `http://www.` → `https://www.`、`http://` 裸域 → `https://www.`、`https://` 裸域 → `https://www.` 全部**单跳 301**，目标规范、无跳链，不存在「一次跳转就劝退」。真正要防的是 http 与 https、裸域与 www 各留一份 200 副本（重复内容）。
5. **详情页是内链孤岛**：详情页正文里的标签是 `<span>`（不可点），页面之间零互链，593 个详情页各自是孤岛，蜘蛛走进来就出不去。
6. **单页静态资源链接只有 35 条**：列表页 HTML 里只渲染前 `pageSize`（35）张卡片，其余靠 JS 拉 `search-index.json` 补齐——而这条请求在子页面下正好是 404（见发现 1）。不执行 JS、或拉不到 JSON 的蜘蛛，从首页只能看到 35 个资源，与 Google 只覆盖 122 个资源页对得上。

### 建议复核（2026-10-09，逐条对着代码与线上实测）

| 原建议 | 结论 | 依据 |
|---|---|---|
| robots.txt 屏蔽内部 JSON | **修正后采纳** | 方向对、对象错。根因是 `theme/assets/app.js` 里 `fetch('search-index.json')` 用了相对路径，在 `/resource/<id>/`、`/category/<slug>/` 下解析成 `/resource/<id>/search-index.json`（实测 404）。只加 robots 挡得住守规矩的 Google/Bing/Baidu，挡不住其余蜘蛛；而且挡掉后 Googlebot 更渲染不出「加载更多」。正解是**先改绝对路径**，再决定挡什么 |
| 稳住首页 lastmod | **不采纳** | 首页 lastmod = 全站最新 `added`（`render.js` 的 `lastmodOfList`），每日热门入库后确实每天变，是真实信号；人为冻结等于给假日期，反而损耗 Google 对 lastmod 的信任。另外 Google 官方文档明确忽略 sitemap 的 `priority` / `changefreq`，调 priority 也不会改变抓取分配。真正卡住覆盖的是发现 5、6——可走的路只有 35 条 |
| 百度主动推 | **降级到 P3** | 实测站点 IP `43.128.54.22` 在**香港**（腾讯云），`site.yaml` 的 `icp` 为空——境外机房 + 无备案，百度 / 360 / 搜狗的配额与信任度基本起不来。有备案与国内机之前，投入产出比远低于 Google / Bing / Yandex |
| Bing/360 起步 + 核对 301 | **Bing 采纳，301 不采纳** | Bing 一侧成立（去 Bing Webmaster Tools 提交 sitemap，IndexNow 已在推）。301 一侧不成立：实测三种入口全部**单跳 301** 到 `https://www.<域名>/`，目标规范、无跳链，蜘蛛不会被劝退。真正要防的是 http / https、裸域 / www 各留一份 200 副本，`deploy/nginx-site.conf.example` 已补上收口做法 |
| 争取新引擎 | **顺手做，不单列投入** | 同「百度」一条：境外站对国内引擎收益有限，各站长平台提交一次 sitemap 即可，不值得为其改站点结构 |
| 404 是「软 404」 | **措辞修正** | 实测返回**硬 404**（nginx `error_page 404 /404.html` 不带 `=`，保留原状态码）。浪费抓取预算成立，软 404 不成立 |

### 已执行的改造（2026-10-09）

| 改动 | 针对 | 产物验证 |
|---|---|---|
| `theme/assets/app.js`：`fetch('search-index.json')` → 绝对路径 `/search-index.json`；预取只在列表页做（有 `#list-data` 的页面），详情页不预取 | 发现 1、6 | 根路径 200；子路径不再被请求，54 个 404 的根因消除 |
| `scripts/build.js`：robots 加 `Disallow: /stats.json`、`Disallow: /hit`；**`/search-index.json` 不挡**（它是 Googlebot 渲染「加载更多」的通道） | 原建议 1 | `robots.txt` 已含两行 |
| 新增全量索引页 `/all/`（`render.js` 的 `allPage` + `build.js` 生成） | 发现 6 | 593 条静态 `<a>` 链接、112 KB、HTTP 200；进 sitemap（priority 0.4），页脚导航每页都有入口 |
| 详情页「相关推荐」6 条（同分类优先、标签重合多的靠前，不够时用跨分类同标签补齐），构建期静态输出 | 发现 5 | 详情页内链出度 0 → 6 |
| `deploy/submit-indexnow.sh` 改增量推送 | 原建议 4（Bing） | 默认只推 `lastmod` ≥ 昨天的 URL；`ALL=1` 全量、`SINCE=<日期>` 自定义起点，无变更时直接退出不空推 |
| `deploy/nginx-site.conf.example` 规范化收口：只有 `https://www.<域名>/` 返回 200 | 发现 4 | 线上已是单跳 301，配置无需改动；示例文件给出证书签发后 http 与裸域的 301 做法（certbot `--redirect` + 两个 `-d`） |

### 待办与观察

- [ ] **两周后回看蜘蛛日志**（唯一能判定成败的口径）：`/resource/*/search-index.json` 的 404 归零；Googlebot 去重资源页数从 122 往上涨；bingbot 是否开始进资源页抓正文。
- [ ] **Bing Webmaster Tools 提交一次 sitemap**：IndexNow 已经在实时递 URL，但站点级 sitemap 提交还没做，bingbot 目前只来过 10 次、资源页只抓了 1 个。
- [ ] **服务器重装一次推送脚本**：`sudo install -m755 deploy/submit-indexnow.sh /usr/local/bin/submit-indexnow`，增量逻辑才生效（cron 不用改）。
- [ ] 百度站长平台提交 sitemap + `submit-baidu` API 推送 —— **P3**，等备案 / 国内机。
- [ ] 搜狗 / 字节 / 华为站长平台提交 sitemap —— **P3**，同上。
- [ ] 分类分页 `/category/<slug>/page/2/…` —— 先看 `/all/` 的效果再决定；分页会引入重复内容，没有明确收益就不做。

### 验收口径

```bash
# 1) 索引只有根路径这一份；robots 已挡统计端点
curl -s -o /dev/null -w '%{http_code}\n' https://www.wodewangpan.top/search-index.json      # 200
curl -s -o /dev/null -w '%{http_code}\n' https://www.wodewangpan.top/all/                   # 200
curl -s https://www.wodewangpan.top/robots.txt                                              # 含 /stats.json、/hit

# 2) 静态可抓链接数：首页 35 条属正常，/all/ 应等于资源总数，每个详情页 6 条「相关推荐」
grep -o 'href="/resource/' public/index.html          | wc -l     # 35
grep -o 'href="/resource/' public/all/index.html       | wc -l     # = 资源总数
grep -o 'href="/resource/' public/resource/mv-010/index.html | wc -l # 6

# 3) 重定向只有一跳，且终点是 200
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://wodewangpan.top/
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://wodewangpan.top/
```

（权威收录量以 Google Search Console、Bing Webmaster Tools、百度站长平台后台报表为准；脚本 `site:` 查询受数据中心 IP 反爬干扰，不作为计数依据。蜘蛛抓取数据取自 VPS 访问日志，不是线上后台，仅作趋势判断。）

## 最新修改

网站代码最新修改内容写在这里。

### 2026-10-09 · SEO 抓取通道改造

依据 VPS 蜘蛛日志的抓取分析（见 [SEO建议优化](#seo建议优化)）做的一轮改动，目标是让搜索引擎走得进、走得深：

| 改动 | 文件 | 说明 |
|---|---|---|
| 索引请求改根绝对路径 | `theme/assets/app.js` | `fetch('search-index.json')` 在 `/resource/<id>/`、`/category/<slug>/` 下会解析成不存在的子路径，是 Google 那 54 个 404 的根因；同时预取只在列表页做，详情页省掉一次请求 |
| robots 只挡统计端点 | `scripts/build.js` | 新增 `Disallow: /stats.json`、`Disallow: /hit`；`/search-index.json` 不挡，它是 Googlebot 渲染「加载更多」的通道 |
| 新增全量索引页 `/all/` | `scripts/lib/render.js`、`scripts/build.js` | 593 条详情页链接按分类平铺成纯 HTML（112 KB），进 sitemap（priority 0.4），页脚导航每页都有入口 |
| 详情页「相关推荐」 | `scripts/lib/render.js` | 底部 6 条同分类（标签重合多的优先）卡片，构建期静态输出；详情页原本是内链孤岛，出度 0 → 6 |
| IndexNow 改增量推送 | `deploy/submit-indexnow.sh` | 默认只推 `lastmod` ≥ 昨天的 URL；`ALL=1` 全量、`SINCE=<日期>` 自定义起点，无变更时不空推 |
| Nginx 规范化收口 | `deploy/nginx-site.conf.example` | 明确「只有 `https://www.<域名>/` 返回 200」，补上证书签发后 http 与裸域的 301 做法；线上实测已是单跳 301，配置无需改动 |

未做（等条件成熟）：百度 / 360 / 搜狗的主动提交——站点在香港且无备案，国内引擎这一档收益有限，见 P3。

