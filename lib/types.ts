/**
 * 数据模型：与 PROJECT_PLAN.md §4 数据库设计一一对应。
 * Phase 1 后期接入 Prisma / PostgreSQL 后，这里的字段保持不变即可。
 */

export type ResourceStatus = "draft" | "published" | "hidden" | "deleted";

/** 网盘链接状态：🟢 active / 🟡 unknown / 🔴 expired·blocked */
export type LinkStatus = "unknown" | "active" | "expired" | "blocked";

/** 第一阶段支持 quark / baidu，后续扩展见 §4.7 */
export type PanType = "quark" | "baidu" | "aliyun" | "uc" | "115" | "123pan";

export interface ResourceLink {
  id: number;
  resourceId: number;
  panType: PanType;
  url: string;
  password?: string;
  status: LinkStatus;
  lastCheckedAt?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  icon?: string;
  sortOrder: number;
  /** 热门二级分类，用于首页聚合展示 */
  children?: Pick<Category, "name" | "slug">[];
}

export interface Resource {
  id: number;
  title: string;
  slug: string;
  /** 一级分类 slug（对应 SEO URL：/film /software /office ...） */
  categorySlug: string;
  subcategorySlug?: string;
  description?: string;
  coverUrl?: string;
  year?: number;
  region?: string;
  language?: string;
  quality?: string;
  size?: string;
  version?: string;
  author?: string;
  publisher?: string;
  status: ResourceStatus;
  views: number;
  likes: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  links: ResourceLink[];
}

export interface HotSearch {
  keyword: string;
  count: number;
  trend: "up" | "flat" | "down";
}

export interface FriendLink {
  name: string;
  url: string;
  desc?: string;
}
