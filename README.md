# wodewangpan · 网盘资源分享站

用 YAML 写资源，构建成**纯静态站点**：海报压缩、二维码、搜索索引、SEO 标签全部在构建期生成，产物丢给 Nginx 就能跑。无数据库、无后端、无登录。

| | |
|---|---|
| 线上 | https://www.wodewangpan.top |
| 仓库 | `git@github.com:linuxhobby/wodewangpan.git` |
| 内容 | 406 个资源 · 7 个分类（电影 244 / 电视剧 72 / 纪录片 77 / 动漫 1 / 游戏 2 / 软件 9 / 其他 1） |
| 更新方式 | 推到 `main`，VPS 每 30 分钟自动拉取并重建 |

## 特性

- **数据即内容**：一个分类一个 YAML，改完 `npm run build` 就出整站
- **构建期图片处理**：配图压成三档 WebP（详情 180×260、卡片 240×360、缩略图 60×90）
- **二维码预生成**：出 SVG 落盘，页面只引用静态图，不依赖 JS
- **纯前端搜索**：支持拼音全拼与首字母、命中高亮、`?q=` 可分享
- **SEO 全自带**：canonical、OG / Twitter Card、JSON-LD、sitemap、robots、404 兜底
- **响应式宫格**：5 列 → 4 列（<1000px）→ 3 列（<820px）→ 2 列（<480px）
- **分类占位海报**：缺图时自动套用分类海报（渐变底 + 专属底纹 + 徽章图标 + 中英文分类名）
- **访问统计自备**：解析 Nginx 日志生成 `/stats.json`，页脚显示「总访问量 / 访客数 / 今日 / 今日访客」，不依赖第三方

## 部署

产物是纯静态文件，任何能托管静态文件的地方都能跑。挑一种照着做即可：

| 方式 | 适合 | 说明 |
|---|---|---|
| **A · VPS + Nginx**（推荐，本站线上方案） | 有域名、要备案、面向国内 | 完全可控，SEO 与访问速度最好 |
| B · GitHub Pages | 免费、不想管服务器 | 国内访问不稳定 |
| C · Cloudflare Pages | 免费、海外快 | 同上，国内偶发不通 |
| D · rsync 直传 | 已有服务器、不经 Git | 一条命令传产物 |

前置：Node ≥ 18（VPS 方案另需 Nginx、Git，Python 3 只在用访问统计时需要）。

### 方案 A：VPS + Nginx

服务器为 Ubuntu 22.04，站点目录 `/opt/wodewangpan`。

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
sudo certbot --nginx -d 你的域名
```

**7）验证**

打开 `https://你的域名`，再跑一遍 [上线自检](#上线自检)。

**8）自动更新（可选，强烈建议）**

推到 `main` 后服务器自动拉取、重建、reload nginx：

```bash
sudo install -m755 deploy/site-autoupdate.sh /usr/local/bin/site-autoupdate
sudo $EDITOR /usr/local/bin/site-autoupdate    # 改开头的 SITE_DIR、BASE_URL 两个变量
sudo crontab -e
# 加入一行：
*/30 * * * * /usr/local/bin/site-autoupdate >> /var/log/site-autoupdate.log 2>&1
```

看运行结果：`tail -20 /var/log/site-autoupdate.log`。回滚：在服务器上 `git reset --hard <上一个 commit>` 再 `BASE_URL=... npm run build`，或本机 `git revert` 后推上去。

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

### 方案 D：rsync 直传

```bash
BASE_URL=https://你的域名 \
REMOTE_USER=root REMOTE_HOST=你的服务器 REMOTE_DIR=/var/www/wodewangpan \
npm run deploy
```

`rsync --delete` 会清掉服务器上已删除的资源页。

### 上线自检

```bash
S=https://你的域名
for u in / /category/%E7%94%B5%E5%BD%B1/ /resource/mv-010/ /sitemap.xml \
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
| **3 · IndexNow（实时推送，技术方式）** | 向 **Bing** 等参与引擎实时递交：站点放一个密钥文件，脚本按 sitemap 分批 POST 给 IndexNow，新页面几分钟内被 Bing 发现 |

方式 3 配置（脚本见 `deploy/submit-indexnow.sh`）：

```bash
# 1) 生成密钥，放到站点可访问的位置
sudo mkdir -p /opt/indexnow && openssl rand -hex 16 | sudo tee /opt/indexnow/key.txt

# 2) Nginx 暴露密钥（deploy/nginx-site.conf.example 已含该段）
#    location = /key.txt { alias /opt/indexnow/key.txt; default_type text/plain; }
sudo nginx -t && sudo systemctl reload nginx
curl -s https://你的域名/key.txt     # 应返回那串密钥

# 3) 安装脚本并立即递交一次
sudo install -m755 deploy/submit-indexnow.sh /usr/local/bin/submit-indexnow
sudo sed -i 's/www.your-domain.com/你的域名/' /usr/local/bin/submit-indexnow
sudo /usr/local/bin/submit-indexnow
tail -3 /var/log/submit-indexnow.log    # 共 559 条：成功 559，失败 0

# 4) 每天自动推（root crontab）
0 3 * * * /usr/local/bin/submit-indexnow >> /var/log/submit-indexnow.log 2>&1
```

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

实测：559 个 URL 分 12 批提交，全部返回 200/202。

## 目录结构

```
data/                # 一个分类一个 YAML，构建时自动合并
  site.yaml          # 站名、分类顺序、免责声明、页脚联系方式、首屏条数
  电影.yaml 电视剧.yaml 纪录片.yaml 动漫.yaml 游戏.yaml 软件.yaml
static/
  favicon.svg        # 站点图标，构建时生成 favicon.ico / apple-touch-icon.png
  images/            # 配图，文件名与资源 id 对应：<id>.jpg / .png / .webp / .svg
theme/assets/        # 前端样式与脚本，构建时拷到 public/assets/
scripts/             # 构建与预览
tools/
  sitestats.py           # 访问统计脚本（VPS 方案用到）
  icon-poster.mjs        # 把应用图标合成 2:3 竖版海报（软件 / 音频等非影视资源）
  book-cover-douban.mjs  # 从豆瓣图书抓书籍封面（电子书 bk- 优先用它，见「经验总结」）
  book-poster.mjs        # 豆瓣查无此书时，生成书封海报兜底
deploy/              # 部署用：Nginx 配置示例、自动更新脚本、统计日志格式
public/              # 构建产物，部署这个目录（约 19MB，不入库）
```

## 站点配置 `data/site.yaml`

```yaml
title: 我的网盘资源站
description: 夸克 / 百度网盘资源索引，打开即用，扫码即存
# 首页 SEO 文案（可选，不填则回退用站名与站描述）；{total} = 资源总数，{categories} = 分类列表
homeTitle: 我的网盘资源站 - 夸克/百度网盘资源索引   # 构建时自动追加「（406 项）」
homeDesc: 夸克 / 百度网盘资源索引，收录 {total} 个{categories}资源，打开即用，扫码即存
homeH1: 网盘资源索引 · 全部资源                 # 首页 H1（分类页仍用分类名）
disclaimer: 本站仅提供网盘资源索引，所有文件均存放于第三方网盘…
categories: [电影, 电视剧, 纪录片, 动漫, 游戏, 软件, 其他]   # 分类栏顺序；未列出的按资源数倒序追加在末尾
contact:                             # 页脚联系方式（可选，整段删掉则不显示）
  twitter: "@xspalice"               # 写 @用户名 或完整链接都行
  telegram: "https://t.me/wodewangpantop"
icp: ""                              # 备案号，留空不显示
stats: local                         # 页脚统计：local = 本地｜busuanzi = 不蒜子｜留空不显示
pageSize: 35                         # 首屏渲染条数，其余由「加载更多」渲染
```

联系方式在页面上只显示为平台小图标（Twitter / Telegram / 邮箱），账号名写在 `title` 与 `aria-label` 里。`stats: local` 依赖服务器上的 `/stats.json`，本机预览时数字显示占位符 `–`，属正常。

## 页面形态

| 页面 | 形态 |
|---|---|
| `/` | 首页宫格，**按 `added` 倒序（最新加入在前）**，最前 6 条带「最新」角标 |
| `/category/<分类>/` | 同样的宫格，只含该分类 |
| `/resource/<id>/` | 180×260 海报 + 120×120 二维码 + 网盘链接与复制按钮 |
| 搜索 | 顶栏即时搜索，结果同样宫格呈现，命中词高亮 |

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
  description: 4K 国语中字   # 可选，详情页正文，上限 1000 字（超出构建时自动截断）
  date: 2013-01-30          # 可选，上映 / 发行日期
  added: 2026-09-21         # 可选，加入时间，决定排序（不填则排最前）
  image: mv-010.jpg         # 可选，默认取 static/images/<id>.<ext>
```

**排序**：`added` 倒序 → 同日按 id 编号倒序 → `date` 倒序 → 文件内原序。

内置网盘字段：`quark_url`、`baidu_url`、`aliyun_url`、`tianyi_url`、`uc_url`、`xunlei_url`、`115_url`、`mobile_url`，提取码为对应 `xxx_code`。多个链接时详情页全部列出。其它网盘用通用写法：

```yaml
  links:
    - name: 迅雷网盘
      url: https://pan.xunlei.com/s/xxxx
      code: ab12
```

**id 规则**：`mv-` 电影、`tv-` 电视剧、`dc-` 纪录片、`an-` 动漫、`game-` 游戏、`app-` 软件、`bk-` 电子书、其他，与 `static/images/` 里的配图同名。

**新增一个分类**：建 `data/<分类>.yaml`，把分类名加进 `site.yaml` 的 `categories`，`npm run build` 即可。

### 配图规范

统一 **600×900 竖版（2:3）**，卡片不会裁切变形：

| 类型 | 来源 |
|---|---|
| 电影 / 电视剧 / 纪录片 / 动漫 | TMDB 海报 `https://image.tmdb.org/t/p/w500/<path>.jpg` |
| 游戏 | Steam 竖版封面 `https://cdn.cloudflare.steamstatic.com/steam/apps/<appid>/library_600x900_2x.jpg` |
| 软件 | 应用商店官方图标，用 `tools/icon-poster.mjs` 合成 600×900 |
| 查不到图 | 不填 `image`，构建自动回退分类占位海报 |
| 电子书 | 豆瓣图书封面，用 `tools/book-cover-douban.mjs` 抓取（约 500×750），做法见 [经验总结](#经验总结) |

## 新增资源

本地跑起来看效果：

```bash
npm install
npm run build                                   # 构建到 public/
npm run serve                                   # 本地预览 http://localhost:4321
BASE_URL=https://你的域名 npm run build          # 正式构建必带域名
npm run dev                                     # build + serve 一步到位
```

三种方式加资源：

1. **交互式**：`npm run new`，逐项询问后写入 `data/<分类>.yaml`
2. **直接改 YAML**，然后 `npm run build`
3. **批量**：先把网盘目录编号重命名，再出公开永久链接，然后按格式批量写 YAML

> 顺序不能反：先给目录编号重命名 → 再出分享链接 → 最后写 YAML。重命名会改分享标题，先出链等于白做。

**改动后**：`npm run build` → 本地 `npm run serve` 看效果 → 推到 `main`（VPS 方案会自动更新）。

改了卡片尺寸等图片参数后需 `rm -rf public && npm run build`。

## 附：其它自带能力

- **站内搜索**：顶栏即时搜索；`taikong`、`tkbd` 都能搜到「太空部队」（支持拼音全拼与首字母），`Ctrl/⌘ + K` 聚焦，搜索时地址栏变 `/?q=关键词` 可直接分享
- **SEO**：每页独立的 title / description、canonical、OG / Twitter Card、JSON-LD、`sitemap.xml`、`robots.txt` 全部构建时自动生成
- **访问统计**：Nginx 日志 → `sitestats.py` 增量解析 → `/stats.json` → 页脚数字；PV 排除爬虫与非页面请求，UV 只统计带访客 cookie 的请求
- **静态资源带版本号**（`/assets/style.css?v=<commit>`），Nginx 缓存 30 天也能在部署后立即生效
- `public/` 不入库，仓库只留源码与数据

## 经验总结

日常维护里踩过、值得记住的几条配置图相关的经验。

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

### 软件配图：拿不到官方图标就自己画

Windows 工具类资源（驱动、激活工具、Office 部署器）常常在 iTunes / GitHub / 官网上都找不到像样的图标。这时候画一个 512×512 的白色线性图标（WiFi 信号、钥匙、下载箭头这类通用符号就够），交给 `tools/icon-poster.mjs` 合成海报（`--title` / `--sub` / `--c1` / `--c2` 控制文字与配色），出来的观感和正版图标的海报是一套的，比塌落到占位图强得多。

顺带一条：GitHub 组织头像用 `https://github.com/<org>.png?size=460` 直接取，别去猜组织的数字 ID，猜错会拿到完全不相干的头像。
