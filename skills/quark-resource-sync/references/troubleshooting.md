# 故障速查

## CLI 报「未登录，请先执行 login」

授权过期或被解绑：

```bash
node ~/.workbuddy/skills/quarkclouddrive/scripts/quark-drive.cjs login
```

登录态在客户端，过期时 `browse` / `share` / `rename` 都会失败。

## SHARE_FID 失效（找不到分类目录）

网盘 fid 形如 `~xxxx|yyyy`，一般长期有效；若 `scan-new.mjs` 报「未找到该分类目录」，重新取一次并更新 `config.env` 的 `SHARE_FID`：

```bash
node ~/.workbuddy/skills/quarkclouddrive/scripts/quark-drive.cjs browse --all --page-size 100
```

在输出里定位 `SHARE` 目录的 fid。

## TMDB 返回异常 / 超时

- 代理端口可能变了：`scutil --proxy | grep HTTPSPort`，把 `config.env` 的 `PROXY` 改成实际端口。
- **代理软件没开 / 域名被劫持**（2026-10 遇过）：`api.themoviedb.org` 被解析到 `198.19.x.x`（fake-ip）或直连超时（`code 000`）。`tmdb.mjs` 已改用官方等价域名 **`api.tmdb.org`**，并实现「代理优先 → 失败自动直连」，一般无需再管代理。
- token 失效：到 TMDB 后台重新取 Read Access Token，写入 `config.env` 的 `TMDB_TOKEN`（文件权限 600）。
- `search` 无结果：换原名（英文）再搜一次，或加 `--year`；仍无结果走未命中分支。

## 海报下载失败（image.tmdb.org 连不上）

`api.tmdb.org` 能查数据，但图片 CDN `image.tmdb.org` / `media.themoviedb.org` 可能被阻断（curl 返回 `000`）。此时改抓豆瓣海报（搜索页可直连，图片需带 UA 与 Referer）：

```bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
# 1) 搜索页取 subject id 与海报路径
curl -s -A "$UA" "https://movie.douban.com/subject_search?search_text=<片名>"
# 2) 下载大图（/view/photo/photo/public/ ≈ 428×600，比 s_ratio_poster 的 270×378 清晰）
curl -sL -A "$UA" -e "https://movie.douban.com/" -o static/images/<id>.jpg \
  "https://img2.doubanio.com/view/photo/photo/public/pXXXXXXX.jpg"
```

豆瓣图片不加 UA + Referer 会返回 418。下载后 `file` 确认是 JPEG，并在报告中注明海报来源不是 TMDB。

## TMDB 未命中

保留网盘目录原名（去掉编号与分辨率/季数等规格），`image` 留空走占位图，简介用一句中性描述，报告中标记为待补。已知 6 条 BBC 冷门纪录片属此情况（原名 + 占位图）。

## 海报下载失败

`tmdb.mjs detail` 输出 `poster_url: null` 时该条目本身无海报。下载中断则重跑同一条命令；下载后确认是有效 JPEG（`file <路径>`），非 500×750 也可用，构建会自行缩放。

## rename 失败

- items JSON 必须是 `{schema_version, items:[{fid, old_name, new_name}]}`，fid 用**完整** FID。
- `new_name` 长度 ≤ 255；同名冲突时按 `quarkclouddrive` 规范让用户选择追加 `(1)` 或跳过。
- 批量失败可用 `rename-revert --batch-id <id>` 整批撤销。

## 出链异常

- 参数固定 `--url-type 1 --expired-type 1`（公开 · 无提取码 · 永久）。
- 短时间内大量出链可能触发风控，逐条执行、失败稍后重试。
- 已有分享的目录重复出链会生成新链接，入库前确认用哪一条。

## 构建失败

多为 YAML 语法问题：简介里的 `"` 需转义、`：` 后不要直接跟特殊字符、标签数组用双引号。`make-entry.mjs` 已做转义与格式校验，尽量用它生成片段。

## 页面 404 / 无样式

见站点 README「常见故障」一节：`root` 指向、`try_files` 含 `$uri/index.html`、`BASE_URL`、中文分类需 URL 编码。
