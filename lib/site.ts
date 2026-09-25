import type { FriendLink } from "./types";

export const SITE = {
  name: "星球资源",
  domain: "PlanetResource",
  slogan: "搜索全网网盘资源，一次到位",
  description:
    "星球资源 PlanetResource 是综合型资源导航站，收录影视、软件、办公模板、电子书、学习课程、设计素材、AI 资源与实用工具，提供统一检索、分类导航与夸克 / 百度网盘一键直达。",
  keywords: [
    "网盘资源",
    "资源搜索",
    "夸克网盘",
    "百度网盘",
    "影视资源",
    "软件下载",
    "PPT 模板",
    "电子书",
  ].join(","),
  notice: "本站仅提供资源信息索引与第三方链接导航，不存储任何资源文件。",
} as const;

/** 顶部导航：对应 PROJECT_PLAN §3.1 一级结构 */
export const NAV_CATEGORIES = [
  { name: "影视", slug: "film" },
  { name: "软件", slug: "software" },
  { name: "办公", slug: "office" },
  { name: "学习", slug: "course" },
  { name: "电子书", slug: "ebook" },
  { name: "素材", slug: "material" },
  { name: "AI", slug: "ai" },
  { name: "工具", slug: "tool" },
] as const;

export const FRIEND_LINKS: FriendLink[] = [
  { name: "夸克网盘", url: "https://pan.quark.cn", desc: "高速转存" },
  { name: "百度网盘", url: "https://pan.baidu.com", desc: "资源最全" },
  { name: "资源投稿", url: "/submit", desc: "补充好资源" },
  { name: "失效反馈", url: "/report", desc: "链接报错" },
  { name: "RSS 订阅", url: "/feed.xml", desc: "最新资源" },
  { name: "星球公告", url: "/about", desc: "站点与合规" },
];
