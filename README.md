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
  影视.yaml           # 资源数据：一个分类一个文件，全部自动合并
  动漫.yaml
  综艺.yaml
  资料.yaml
  软件.yaml
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

设置正式域名后重新构建，让 sitemap 里的地址生效：

```bash
BASE_URL=https://your-domain.com npm run build
```

## 实现要点

- 二维码在构建时用 `qrcode` 生成 SVG 落盘，页面只引用静态图片，不依赖 JS
- 搜索为客户端索引（全站 `search-index.json`，列表页内联本页数据），无后端
- 复制按钮使用 `navigator.clipboard`，不支持时回退 `execCommand`
- 无登录、无评论、无广告、无动画；单栏 760px 居中布局
