# 网盘资源分享站

夸克 / 百度网盘资源索引静态站。数据写在 YAML 里，构建时一次性生成全部页面（含二维码、配图压缩），产出纯静态文件，Nginx 直接托管，无需数据库和后端。

## 快速开始

```bash
npm install          # 安装依赖（sharp 可选，缺失时配图按原图输出）
npm run build        # 构建到 public/
npm run serve        # 本地预览 http://localhost:4321
```

> 构建前建议 `npm i sharp`，会自动压缩配图并生成 WebP（详情页 180×260、列表页 60×90）。

## 目录结构

```
data/
  site.yaml          # 站名、分类顺序、免责声明、首屏条数
  电影.yaml           # 资源数据：一个分类一个文件，全部自动合并（新增分类直接加文件）
  电视剧.yaml
  纪录片.yaml
static/images/       # 配图，文件名与资源 id 对应：<id>.jpg / .png / .webp / .svg
theme/assets/        # style.css、app.js（构建时拷到 public/assets/）
scripts/
  build.js           # 构建主流程
  serve.js           # 零依赖本地预览服务
  new-resource.js    # 交互式新增资源
  deploy.sh          # 构建 + rsync 到 VPS
public/              # 构建产物（部署这个目录）
nginx.conf.example   # Nginx 配置参考
```

## 数据格式

一条列表项 = 一个详情页：

```yaml
- id: movie-001            # 可选，留空自动生成；决定详情页 URL 与配图文件名
  title: 沙丘 2             # 必填
  category: 影视            # 必填，自动出现在分类栏
  tags: [科幻, 4K]          # 可选，数组或逗号分隔
  quark_url: https://pan.quark.cn/s/xxxx    # 各网盘链接，至少填一个
  baidu_url: https://pan.baidu.com/s/xxxx
  baidu_code: sf2k          # 提取码
  description: 4K 国语中字   # 可选
  date: 2026-09-20          # 可选，用于倒序排序
  image: movie-001.jpg      # 可选，默认取 static/images/<id>.<ext>
```

支持的网盘字段：`quark_url`、`baidu_url`、`aliyun_url`、`tianyi_url`、`uc_url`、`xunlei_url`、`115_url`、`mobile_url`，对应提取码字段为 `xxx_code`（如 `baidu_code`）。  
需要其它网盘时可用通用写法：

```yaml
  links:
    - name: 迅雷网盘
      url: https://pan.xunlei.com/s/xxxx
      code: ab12
```

## 新增 / 更新资源

```bash
npm run new          # 交互式录入，按分类自动写入 data/<分类>.yaml
npm run build        # 重新生成整站（3000 条约 3 秒）
npm run deploy       # 构建并 rsync 到 VPS
```

`data/` 下所有 `.yaml`（`site.yaml` 除外）在构建时自动合并，所以资源可以按分类拆成多个文件维护，
也可以按时间归档（`data/2026-09.yaml`）。新增分类无需改配置，标签栏会自动出现。

部署只需把 `public/` 放到 Nginx 站点目录：

```bash
REMOTE_USER=root REMOTE_HOST=1.2.3.4 REMOTE_DIR=/var/www/share-resource npm run deploy
```

## 生成物

| 路径                                       | 说明                              |
| ---------------------------------------- | ------------------------------- |
| `/`                                      | 全部资源列表（首屏 60 条静态渲染，其余由「加载更多」渲染） |
| `/category/<分类>/`                        | 分类列表页                           |
| `/resource/<id>/`                        | 详情页：配图 + 二维码 + 网盘链接复制           |
| `/search-index.json`                     | 客户端搜索索引，输入时按需加载                 |
| `/img/<id>-180.webp` `/img/<id>-60.webp` | 构建时压缩的详情页 / 列表页配图               |
| `/img/placeholder.svg`                   | 缺图时的统一占位图                       |
| `/qr/<id>-<网盘>.svg`                      | 构建时预生成的二维码                      |
| `/sitemap.xml` `/robots.txt` `/404.html` | SEO 与兜底                         |

**部署前必须设置域名**，否则 canonical / OG / sitemap 会指向 `example.com`：

```bash
BASE_URL=https://your-domain.com npm run build
```

## 实现要点

- 二维码在构建时用 `qrcode` 生成 SVG 落盘，页面只引用静态图片，不依赖 JS
- 搜索为客户端索引（全站 `search-index.json`，列表页内联本页数据），无后端
- 复制按钮使用 `navigator.clipboard`，不支持时回退 `execCommand`
- 无登录、无评论、无广告、无动画；单栏 760px 居中布局

## SEO

构建时自动生成，无需手工维护：

| 项目                  | 说明                                                        |
| ------------------- | --------------------------------------------------------- |
| `title` / `description` | 每页独立；详情页用「标题 - 站名」，描述取简介前 100 字                          |
| `canonical`         | 每页指向自身绝对地址，避免 `/index.html` 与 `/` 重复                     |
| OG / Twitter Card   | `og:title` `og:description` `og:image` `og:url`，分享到微信/微博有卡片 |
| JSON-LD             | 详情页 `Movie` / `TVSeries`（按分类）+ 面包屑；列表页 `WebSite`（含搜索框）+ `ItemList` |
| `sitemap.xml`       | 首页 + 分类页 + 全部详情页，带 `lastmod` 和优先级                         |
| `robots.txt`        | 全站开放，并声明 sitemap 地址                                      |
| 语义化                 | 列表用 `ul/li`，详情页 `article` + `h1`，图片带 `alt`                 |
| 性能                  | 首屏前 5 张图 `eager + fetchpriority=high`（LCP），其余懒加载          |

注意：首页首屏只静态渲染 `pageSize` 条，其余靠 JS 加载；但 **全部详情页都在 sitemap 里**，搜索引擎照样能抓全。

## 站内搜索

顶栏搜索框，纯前端、无后端、输入即时出结果：

- **拼音**：`taikong`、`tkbd` 都能搜到「太空部队」（构建时用 `pinyin-pro` 生成全拼与首字母，产物里只存字符串）
- **相关度排序**：标题完全匹配 100 > 标题前缀 60 > 标题包含 40 > 标签 22 > 简介 12 > 全拼 30/18 > 首字母 26/14；多个词是「与」关系
- **命中高亮**：标题里命中的关键词用 `<mark>` 标出
- **防抖 120ms**，结果最多 120 条
- **快捷键**：`Ctrl/⌘ + K` 或 `/` 聚焦，`Esc` 清空
- **URL 同步**：搜索时地址栏变成 `/?q=关键词`，可直接分享链接（也是 JSON-LD 里 SearchAction 的地址）

`pinyin-pro` 只在构建机用（`devDependency`），产物不含任何拼音词典。
