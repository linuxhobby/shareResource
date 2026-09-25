# 星球资源 PlanetResource（网盘资源分享站 · 纯静态版）

一个零后端、零数据库、零外网依赖的资源索引站。页面只负责展示网盘链接并生成二维码，不提供下载、不提供观看、不托管任何文件。

## 目录结构

```
PlanetResource/
├── index.html              页面骨架
├── assets/
│   ├── style.css           样式（含移动端适配）
│   ├── app.js              前端逻辑：筛选、排序、搜索、二维码、复制
│   └── vendor/
│       └── qrcode.min.js   本地二维码生成库（MIT 协议，离线可用）
├── data/
│   └── resources.js        资源数据，唯一需要日常编辑的文件
└── README.md
```

## 本地预览

数据放在 `.js` 文件里而不是 `.json`，因此直接双击 `index.html` 也能打开（没有 fetch 的跨域限制）。需要连同占位图片一起验证时，建议起一个本地服务：

```bash
cd PlanetResource
python3 -m http.server 8765
# 浏览器打开 http://127.0.0.1:8765
```

## 添加资源

编辑 `data/resources.js`，往 `window.RESOURCES` 数组里加一个对象即可，页面会自动生成卡片、分类筛选、网盘筛选和二维码。

```js
{
  id: 'unique-id',            // 唯一标识，详情页锚点 #unique-id 用它
  title: '资源标题',
  desc: '一句话描述',
  category: '设计素材',        // 自由填写，自动成为分类筛选项
  pan: 'quark',               // 对应 window.PAN_MAP 里的标识
  url: 'https://pan.quark.cn/s/xxxx',
  code: 'abcd',               // 提取码，没有就留空字符串
  size: '3.2 GB',
  tags: ['字体', '开源'],
  date: '2026-09-18',
  top: true                   // 可选，置顶
}
```

网盘类型在 `window.PAN_MAP` 中管理，默认已内置夸克、百度、阿里云盘、UC、迅雷、天翼、115、123、微云、移动云盘、PikPak。新增一个网盘，加一行 `{ '<标识>': { name: '显示名', color: '#3b6bff' } }` 即可。

如果手上已有一张现成的二维码图片，可以给条目加 `qrImage: 'qr/xxx.png'`，页面会直接显示这张图，不再自动生成。

## 标题与公告

`window.SITE_CONFIG` 控制站点文案：

- `title`：站名，同时作为浏览器标签标题
- `subtitle`：副标题
- `notice`：顶部公告，留空则不显示
- `footerNote`：页脚声明

## 已实现的功能

| 功能 | 说明 |
| --- | --- |
| 搜索 | 覆盖标题、描述、标签、分类、网盘名、链接全文 |
| 分类筛选 | 按 `category` 自动生成，带数量统计，可与网盘筛选叠加 |
| 网盘筛选 | 按 `pan` 自动生成，数量随当前分类联动 |
| 排序 | 最新在前、标题字典序、体积由大到小，支持单条置顶 |
| 二维码 | 前端实时生成 SVG，内容就是网盘链接，扫码直达 |
| 弹窗详情 | 网盘、提取码、体积、更新日期、标签、链接原文 |
| 一键复制 | 复制链接，或复制链接加提取码，带 Toast 提示 |
| 保存二维码 | 把二维码导出为 PNG 下载 |
| 深链分享 | 弹窗打开时地址栏变成 `#资源id`，把这个链接发给别人，对方打开直接定位到该资源 |
| 移动端 | 单列布局，弹窗自动降级为上下堆叠 |

## 部署

整站是纯静态文件，任何静态托管都能放：

1. GitHub Pages：仓库 Settings 里选分支根目录，上传即可。
2. Vercel / Netlify：拖拽整个文件夹，或连接仓库自动构建（无构建步骤）。
3. 对象存储：阿里云 OSS、腾讯云 COS、Cloudflare Pages 开静态网站托管。
4. 自有服务器：Nginx 指向该目录，建议开启 gzip 和 HTTPS。

每次更新资源只需重新上传 `data/resources.js`，浏览器端硬刷新（Ctrl/Cmd + Shift + R）即可看到最新内容。

## 说明

二维码生成算法来自 Kazuhiko Arase 的 qrcode-generator（MIT），已随源码放在 `assets/vendor/`，因此站点在断网、内网环境下同样可用，也不受任何 CDN 可用性影响。

请仅分享自己拥有合法权利的链接，并遵守各网盘平台的服务条款。本站只做索引，所有文件仍存放在原始网盘中。
