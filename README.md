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
  images/            # 配图，文件名与资源 id 对应：<id>.jpg / .png / .webp / .svg；全部平铺在一个目录，不按分类分桶（结论见「经验总结」）
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

## 配图规范

## SKILL 变更

## SEO建议优化

## 最新修改


