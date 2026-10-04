---
name: quark-resource-sync
description: 同步夸克网盘 SHARE 目录的新增资源到 ShareResource 静态站：扫描未编号目录 → 按分类顺序编号重命名 → 生成永久公开分享链接 → 抓取 TMDB 中文信息与海报 → 写入 data/*.yaml → 构建并冒烟。当用户说"网盘新增了资源""同步夸克""补录资源""把新电影/新剧加到网站""给夸克目录编号""夸克目录改名"时使用。
version: "1.0"
agent_created: true
---

# 夸克网盘 → 资源站同步

把夸克网盘 `SHARE/` 下新增的资源目录，编号、出链、抓取信息后上线到 ShareResource 静态站。

## 前置

| 项 | 位置 |
|---|---|
| 本地配置（TMDB token / 代理 / 仓库路径 / SHARE fid） | `~/.workbuddy/skills/quark-resource-sync/config.env` |
| 夸克 CLI | `~/.workbuddy/skills/quarkclouddrive/scripts/quark-drive.cjs` |
| 站点仓库 | `config.env` 的 `REPO`（默认 `~/Documents/GitHub/ShareResource`） |
| 数据文件 | `$REPO/data/电影.yaml`、`电视剧.yaml`、`纪录片.yaml` |
| 海报目录 | `$REPO/static/images/` |

TMDB 走官方域名 `api.tmdb.org`（`api.themoviedb.org` 在本机可能被 DNS 劫持）；脚本「代理优先 → 失败自动直连」，代理没开也能用。海报 CDN `image.tmdb.org` 若连不上，按 `references/troubleshooting.md` 改用豆瓣图源。

## 扫描范围

- 覆盖 `SHARE/` 下**所有**分类目录，不只电影/剧集：电影 / 电视剧 / 纪录片 / 动漫 / 游戏 / 应用（网盘目录 `02应用`，站内分类名「软件」）/ 其他（网盘目录 `007其他`）。
- **排除 `99-待删除`**：不扫描、不编号、不出链、不入站。里面的东西视为待清理，由用户在网盘自行处理。
- SHARE 下若出现站点没有对应分类的目录，扫描照列但标注 ⚠ 并**不入库**，先问用户归属再动。要新增分类：建 `data/<分类>.yaml` + 把分类名加进 `site.yaml` 的 `categories`，构建会自动带上分类页、sitemap 与搜索索引。
- 分类目录里只统计子目录（一个资源 = 一个目录）；散落文件单独计数提示，不参与编号，也不出链。

## 编号与 id 规则

- 网盘目录名：`001-片名`、`070-真相捕捉 1-2季全集…`，三位补零，编号取该分类目录内现有最大值 +1。
- 资源 id：分类目录 `04电影`→`mv-`、`03电视剧`→`tv-`、`06纪录片`→`dc-`、`05动漫`→`an-`、`01游戏`→`game-`、`02应用`→`app-`（网盘目录名 `02应用` 保持不动，站内分类名是「软件」）、`007其他`→`ot-`（站内分类名「其他」），后接同一编号。
- **页面标题不带编号**，编号只用于网盘排序与资源 id（全站 150+ 条一致，勿破例）。
- 已编号的目录**不要动**，只处理未编号目录。
- 所有分类一视同仁：游戏、软件（网盘目录 `02应用`）这类目录同样按 `001-名称` 接续编号，不因为是软件就免编号。
- ⚠️ **未编号的目录禁止直接出链**。必须先重命名再出链：重命名会改变分享标题，且重命名后重新出链拿到的是**另一个 URL**，先出的那条即作废。
- `scan-new.mjs` 覆盖 SHARE 下全部 6 个分类（游戏、软件同样参与编号），各分类顺序一致——先 `rename` 再出链。

## 流程

### 1. 扫描

```bash
node ~/.workbuddy/skills/quark-resource-sync/scripts/scan-new.mjs --out /tmp/scan-new.json
```

输出每个分类的总数、下一可用编号、未编号目录清单，并对疑似重复项标注 `⚠ 疑似重复于 → 015-疑犯追踪`。

**先看重复标注**：归一化后与某个已编号目录同名，通常是用户转存了两次。停下来问用户「删重复的 / 保留并补录 / 是不同版本」，不要在未确认时删除或重复入库。

### 2. 确认范围

向用户展示待处理清单（目录名 + 拟定编号），确认后再动网盘。

### 3. 重命名（必须在出链之前）

按 `quarkclouddrive` 技能的规范：写 items JSON 到可写目录，生成 16 位十六进制 batch ID，展示原名→新名对照后执行：

```json
{ "schema_version": 1, "items": [{ "fid": "<完整 FID>", "old_name": "真相捕捉 1-2季全集…", "new_name": "070-真相捕捉 1-2季全集…" }] }
```

```bash
B=$(node -e "console.log(require('crypto').randomBytes(8).toString('hex'))")
node ~/.workbuddy/skills/quarkclouddrive/scripts/quark-drive.cjs rename --batch-id "$B" --items-file /tmp/rename-items.json
```

改名不改 fid，出链可直接用原 fid。

> 若发现某条已经提前出了链接，重命名后**必须重新出链**，并同步改写 `data/*.yaml` 里的 `quark_url`（旧 URL 与新目录名不对应，且链接本身也会变）。

### 4. 出链（公开 · 无提取码 · 永久）

```bash
node ~/.workbuddy/skills/quarkclouddrive/scripts/quark-drive.cjs share "<FID>" \
  --title "070-真相捕捉" --url-type 1 --expired-type 1
```

取返回的 `share_url`。

### 5. 抓信息（TMDB）

```bash
node ~/.workbuddy/skills/quark-resource-sync/scripts/tmdb.mjs search --type tv --query "真相捕捉" [--year 2019]
node ~/.workbuddy/skills/quark-resource-sync/scripts/tmdb.mjs detail --type tv --id 93166 \
  --poster "$REPO/static/images/tv-070.jpg"
```

- `--type` 电影用 `movie`，剧集/纪录片用 `tv`。
- 搜索无结果或明显不是同一部 → 走「TMDB 未命中」：标题用网盘目录原名（去掉编号与技术规格），简介写一句中性描述，并在报告里说明。
- **软件 / 音频等非影视资源**（TMDB 一定命中不了）先找官方图标合成海报，比直接留占位图好看：

  ```bash
  curl -s "https://itunes.apple.com/search?term=<关键词>&entity=software&country=cn&limit=3"   # entity=macSoftware 找 Mac 版；取 artworkUrl512
  node "$REPO/tools/icon-poster.mjs" --icon "<artworkUrl512>" --out "$REPO/static/images/<id>.jpg" \
    --title "<名称>" --sub "<一句话定位>" --c1 "<主色>" --c2 "<辅色>" [--radius 22]
  ```

  圆角图标（已自带圆角）不加 `--radius`；App Store 的直角方形图标给 `--radius 22`。取完用 `sharp` 渲染成 PNG 预览确认再入库。
- 实在找不到官方图标才退回 `image: placeholder.svg`（构建时自动套用所属分类的占位海报：渐变底 + 专属底纹 + 分类图标 + 分类名）。
- 简介用 TMDB 完整简介（上限 300 字，极少触及），结尾追加 `｜TMDB <评分>`；详情页正文原样展示，列表卡片与 meta 由构建脚本自行截取。

### 6. 写入数据

```bash
node ~/.workbuddy/skills/quark-resource-sync/scripts/make-entry.mjs --data '{
  "id":"tv-070","title":"真相捕捉","category":"电视剧",
  "tags":["电视剧","犯罪","剧情","悬疑","真相捕捉 The Capture"],
  "quark_url":"https://pan.quark.cn/s/xxxx","description":"…｜TMDB 7.6",
  "date":"2019-09-03","added":"2026-09-29","image":"tv-070.jpg"}'
```

脚本校验 id / 分类 / 链接 / 日期格式与海报是否存在，输出 YAML 片段；确认后追加到对应 `data/<分类>.yaml` 末尾。字段含义见 `references/site-schema.md`。

### 7. 构建 + 冒烟

```bash
cd "$REPO" && npm run build
```

再启动 `node scripts/serve.js`，对 `/`、`/resource/<id>/`、`/img/<id>-240.webp`、`/qr/<id>-quark.svg`、`/category/<url编码分类>/` 各取一次 HTTP 状态，全部 200 才算完成；详情页需 grep 到正确的 `pan.quark.cn/s/...`。

> **每次同步结束都要自动打开本地预览**（用户偏好）：冒烟通过后**不要** `pkill`，保留 `scripts/serve.js` 在后台运行，并用 IDE 预览能力打开 `http://localhost:4321/`（服务已跑则直接打开，别重启）。收尾报告里带上预览地址。

## 收尾报告

向用户汇报：目录原名→新名、分享链接、TMDB 命中情况（id / 评分 / 类型）、海报、数据文件、构建结果、冒烟结果；未命中或异常单独列出。

## 边界

- 不删除任何网盘文件（CLI 无删除命令，重复目录交给用户手动处理并给出清单）。
- 不在页面标题加编号。
- 不对未编号目录出链。手动处理单条（不走 `process-batch.mjs`）时一样先 `rename` 再 `share`——脚本已经把「重命名 → 出链」写死，手动流程不得绕过。
- 不改动 `theme/`；要调页面观感另开任务。
- 一次批量处理多部时，逐部执行 3→6 步，避免串号；编号按扫描结果顺序分配，中途不重新查询。

## 参考

- `references/site-schema.md` — 数据字段、分类与 id 映射、构建产物、冒烟清单
- `references/troubleshooting.md` — 授权过期、代理不通、TMDB 未命中、海报缺失、编号冲突
