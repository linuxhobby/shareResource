# wodewangpan · 网盘资源分享站

用 YAML 写资源，构建成**纯静态站点**：海报压缩、二维码、搜索索引、SEO 标签全部在构建期生成，产物丢给 Nginx 就能跑。无数据库、无后端、无登录。

| | |
|---|---|
| 线上 | https://www.wodewangpan.top |
| 仓库 | `git@github.com:linuxhobby/wodewangpan.git` |
| 更新方式 | 推到 `main`，VPS 每 60 分钟自动拉取并重建 |

## 建议优化

> 2026-10-08 记录：Bing Webmaster Tools 提示「URL 已知，但存在阻碍索引的问题」，以下是排查结论与待办。

**技术项**：canonical、非 www 与 http 的 301、IP 直访 404、`robots.txt`、sitemap 全部正常，IndexNow 连续推送无失败；复查时另查出「`index.html` 重复 URL」这一项，已一并修掉（下表第 0 项）。

**症结是内容厚度**：589 条资源简介中位仅 150 字，58% 不足 200 字（软件分类中位 107 字），且简介全部转载自 TMDB——对 Bing 同时构成 thin content 与 duplicate content；整站为外链聚合形态，容易撞上门页（doorway page）判定。

| 优先级 | 动作 | 说明 | 状态 |
|---|---|---|---|
| 0 | `index.html` 形式 301 到目录式 URL | 原先 `/resource/mv-260/index.html` 直接 200，等于全站多出 600 个重复地址；Nginx 规则见 `deploy/nginx-site.conf.example` | ✅ 2026-10-08 |
| 1 | `robots.txt` 屏蔽搜索结果页 | 已加 `Disallow: /*q=`，搜索页不再占用抓取配额 | ✅ 2026-10-08 |
| 2 | 详情页资源信息块 | 分类 / 上映年份 / 入库日期 / 标签 / 转存来源，取 YAML 现有字段，无需额外维护数据 | ✅ 2026-10-08 |
| 3 | 补厚过短简介 | `npm run list:short -- --limit=30`，清单落在 `.tmp/short-desc.md`；236 条不足 120 字，其中 7 条只剩评分后缀 | ⏳ 待补内容 |
| 4 | 增加信任信号 | 充实「关于本站」、补一两个外链、Bing WMT 用 URL 提交工具逐条提（每天 10–100 条） | ⏳ 待做 |

预期：Bing 对新站 + 聚合内容的容忍度明显低于 Google（同期 Googlebot 抓取 750 次，Bingbot 仅 1 次），优化后通常仍需 1–4 周见效，且不保证全部收录。

## 特性

- **数据即内容**：一个分类一个 YAML，改完 `npm run build` 就出整站
- **构建期图片处理**：配图压成两档 WebP（海报 240×360，列表页与详情页共用同一张；缩略图 60×90）
- **二维码预生成**：出 SVG 落盘，页面只引用静态图，不依赖 JS
- **纯前端搜索**：支持拼音全拼与首字母、命中高亮、`?q=` 可分享
- **SEO 全自带**：canonical、OG / Twitter Card、JSON-LD、sitemap、robots、404 兜底
- **响应式宫格**：5 列 → 4 列（<1000px）→ 3 列（<820px）→ 2 列（<480px）
- **分类占位海报**：缺图时自动套用分类海报（渐变底 + 专属底纹 + 徽章图标 + 中英文分类名）
- **首屏数据内联**：列表页把前 `pageSize × 2` 条内联进 HTML，首屏无 JS 也能看；其余在「加载更多」时从 `search-index.json` 异步补齐，586 条时首页 HTML 约 60K
- **入库时刻排序**：首页 / 分类页按 `added` 倒序，`added` 写到时分（`"2026-10-07 17:40"`）就能精确到入库先后
- **访问统计自备**：解析 Nginx 日志生成 `/stats.json`，页脚显示「总访问量 / 访客数 / 今日 / 今日访客」，不依赖第三方
- **首页专属分享卡**：`og:image` 用预渲染的 `static/share.jpg`（1200×630，品牌渐变 + logo + 站名 + 一句定位），分享出去是一张品牌图而不是某条资源的配图；分类页与详情页仍用各自资源配图

## 部署

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
sudo certbot --nginx -d 你的域名
```

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
for u in / /category/movie/ /resource/mv-010/ /sitemap.xml \
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
tail -3 /var/log/submit-indexnow.log    # 本站当前 595 条 URL：成功 595，失败 0

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
contact:                             # 页脚联系方式（可选，整段删掉则不显示）
  twitter: "@xspalice"               # 写 @用户名 或完整链接都行
  telegram: "https://t.me/wodewangpantop"
icp: ""                              # 备案号，留空不显示
stats: local                         # 页脚统计：local = 本地（读服务端 /stats.json）｜留空不显示
pageSize: 35                         # 首屏渲染条数；构建时内联前 pageSize × 2 条，其余由「加载更多」按需补齐
```

联系方式在页面上只显示为平台小图标（Twitter / Telegram / 邮箱），账号名写在 `title` 与 `aria-label` 里。`stats: local` 依赖服务器上的 `/stats.json`，本机预览时数字显示占位符 `–`，属正常。

## 页面形态

| 页面 | 形态 |
|---|---|
| `/` | 首页宫格，**按 `added` 倒序（最新加入在前）**，`added` 带到时分时精确到入库先后；最前 6 条带「最新」角标 |
| `/category/<分类>/` | 同样的宫格，只含该分类 |
| `/resource/<id>/` | 240×360 海报（与列表宫格卡片同图同尺寸）+ 二维码（最多 3 个网盘链接各一张）+ 网盘链接与复制按钮 |
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

内置网盘字段：`quark_url`、`baidu_url`、`aliyun_url`、`tianyi_url`、`uc_url`、`xunlei_url`、`115_url`、`mobile_url`，提取码为对应 `xxx_code`。多个链接时详情页全部列出。其它网盘用通用写法：

```yaml
  links:
    - name: 迅雷网盘
      url: https://pan.xunlei.com/s/xxxx
      code: ab12
```

**id 规则**：`mv-` 电影、`tv-` 电视剧、`dc-` 纪录片、`an-` 动漫、`game-` 游戏、`app-` 软件、`bk-` 电子书、`ot-` 其他，后接三位编号，与 `static/images/` 里的配图同名。

**新增一个分类**：建 `data/<英文名>.yaml`（建议缩写，中文文件名在 Git 与命令行里会变成转义串），把分类名加进 `site.yaml` 的 `categories`，`npm run build` 即可。

### 配图规范

统一 **2:3 竖版**，源图宽度不低于 480（构建时统一裁成海报 240×360 与缩略图 60×90 两档），卡片不会裁切变形：

| 类型 | 来源 |
|---|---|
| 电影 / 电视剧 / 纪录片 / 动漫 | TMDB 海报 `https://image.tmdb.org/t/p/w500/<path>.jpg`（500×750） |
| 游戏 | Steam 竖版封面 `https://cdn.cloudflare.steamstatic.com/steam/apps/<appid>/library_600x900_2x.jpg` |
| 软件 | 应用商店官方图标，用 `tools/icon-poster.mjs` 合成 480×720，做法见 [经验总结](#经验总结) |
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

## 附：其它自带能力

- **站内搜索**：顶栏即时搜索；`taikong`、`tkbd` 都能搜到「太空部队」（支持拼音全拼与首字母），`Ctrl/⌘ + K` 聚焦，搜索时地址栏变 `/?q=关键词` 可直接分享
- **SEO**：每页独立的 title / description、canonical、OG / Twitter Card、JSON-LD、`sitemap.xml`、`robots.txt` 全部构建时自动生成
- **首页分享图单独一张**：`og:image` / `twitter:image` 指向 `/share.jpg`，并带 `og:image:width` / `og:image:height`（1200×630），微信 / Twitter 抓取时能直接按大图卡渲染；分类页与详情页仍用各自资源配图
- **分享卡是预渲染进仓库的**（`static/share.jpg`）：出图要中文字体，放在构建机或服务器上跑会掉字，所以图提交进 Git，构建只做复制
- **sitemap `lastmod` 用资源真实入库日期**，不是每次构建全站刷新，避免搜索引擎误判全站频繁变更
- **首屏内联 + 异步补齐**：列表页只内联前 `pageSize × 2` 条（够首屏与第一次「加载更多」），其余从 `search-index.json` 按需取，586 条时首页 HTML 约 60K
- **访问统计**：Nginx 日志 → `sitestats.py` 增量解析 → `/stats.json` → 页脚数字；PV 排除爬虫与非页面请求，UV 只统计带访客 cookie 的请求
- **静态资源带版本号**（`/assets/style.css?v=<commit>`），Nginx 缓存 30 天也能在部署后立即生效
- **拼音索引是构建期生成的**（`pinyin-pro` 在 `devDependencies`）：装依赖时别加 `--omit=dev`，否则搜索退化成只按字面匹配
- `public/` 不入库，仓库只留源码与数据

## 经验总结

日常维护里踩过、值得记住的几条经验，都和配图与分类有关。

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

`scripts/lib/assets.js` 的 `CAT_STYLE` 目前收录 电影 / 电视剧 / 纪录片 / 动漫 / 游戏 / 软件 / 其他 七个分类，每个配了渐变底色、徽章图标、专属底纹和英文副标题。**没收录的分类不会报错，但观感会塌一档**：按分类名派生色相，图标退回文件夹、底纹退回波浪、英文副标题留空（后加的 `电子书` 目前就是这种）。要补齐，在 `CAT_STYLE` 加一行（`c1` / `c2` / `icon` / `en` / `tex`），图标从 `ICONS` 里挑（`film` `tv` `globe` `bubble` `pad` `window` `folder`），不够就再加图标与底纹函数（`TEX`）。

缺图的回退顺序是：分类占位海报（`/img/placeholder-<分类>.svg`）→ 通用占位图（`/img/placeholder.svg`，只有分类未知时才走到）。目前 586 条里只有 2 条走占位图：`mv-240`、`app-080`，都是有意留空。
