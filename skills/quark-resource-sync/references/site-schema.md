# 站点数据与产物说明

## 目录 → 分类 → id 映射

| SHARE 子目录 | 数据文件 | id 前缀 | 示例 |
|---|---|---|---|
| `04电影` | `data/电影.yaml` | `mv-` | `mv-011` |
| `03电视剧` | `data/电视剧.yaml` | `tv-` | `tv-070` |
| `05纪录片` | `data/纪录片.yaml` | `dc-` | `dc-007` |

编号三位补零，与网盘目录名前缀一致。

## YAML 字段

```yaml
- id: tv-070                 # mv-/tv-/dc- + 三位编号
  title: "真相捕捉"           # 页面标题，不带编号
  category: 电视剧            # 电影 / 电视剧 / 纪录片
  tags: ["电视剧", "犯罪", "剧情", "悬疑", "真相捕捉 The Capture"]
                              # 首个标签为分类名，随后是 TMDB 类型，最后是「中文名 原名」
  quark_url: "https://pan.quark.cn/s/xxxx"
  description: "…｜TMDB 7.6"  # TMDB 完整简介（上限 300 字），结尾带 ｜TMDB 评分
  date: 2019-09-03            # 首播 / 上映日期（TMDB）
  added: 2026-09-29           # 入库日期（网盘目录新增日期）
  image: tv-070.jpg           # 位于 static/images/<id>.jpg
```

## 图片

构建时由 `static/images/<id>.jpg` 生成三档：`-240`（卡片 240×360）、`-180`（详情页）、`-60`（缩略图），输出为 `public/img/*.webp`。原图建议 500×750（TMDB `w500`）。

无海报时省略 `image`，构建会回落到占位图。

## 构建与产物

```bash
cd "$REPO" && npm run build     # 输出 public/
node scripts/serve.js           # 本地预览 http://localhost:4321
```

`public/` 下：资源页 `/resource/<id>/index.html`、分类页 `/category/<分类>/`、搜索索引 `/search-index.json`、站点地图 `/sitemap.xml`、二维码 `/qr/<id>-quark.svg`。带真实域名发布时必须 `BASE_URL=https://域名 npm run build`。

## 冒烟清单

| 路径 | 期望 |
|---|---|
| `/` | 200（首页宫格含新卡片） |
| `/resource/<id>/` | 200，标题正确，含 `pan.quark.cn/s/...` |
| `/img/<id>-240.webp` | 200 |
| `/qr/<id>-quark.svg` | 200 |
| `/category/%E7%94%B5%E8%A7%86%E5%89%A7/` | 200（分类页需 URL 编码） |
| `/nope` | 404 |
