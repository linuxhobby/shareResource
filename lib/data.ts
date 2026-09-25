import { CATEGORIES, HOT_SEARCHES, RESOURCES } from "./mock";
import type { Category, HotSearch, Resource } from "./types";

/**
 * 数据查询门面：组件只依赖这里暴露的函数。
 * 接入 PostgreSQL / Prisma 后，把函数体换成 Prisma 查询即可（PROJECT_PLAN §6 API 对齐）。
 */

const published = RESOURCES.filter((item) => item.status === "published");

export function getCategories(): Category[] {
  return [...CATEGORIES].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug || c.children?.some((child) => child.slug === slug));
}

export function countByCategory(slug: string): number {
  if (!slug) return published.length;
  const category = getCategory(slug);
  if (!category) return 0;
  return published.filter(
    (item) => item.categorySlug === category.slug || item.subcategorySlug === slug,
  ).length;
}

/** 最新资源：按创建时间倒序 */
export function getLatestResources(limit = 12): Resource[] {
  return [...published]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit);
}

/** 热门资源：综合热度 = 浏览 + 点赞权重 */
export function getHotResources(limit = 10): Resource[] {
  const score = (item: Resource) => item.views + item.likes * 8;
  return [...published].sort((a, b) => score(b) - score(a)).slice(0, limit);
}

export function getResourceBySlug(slug: string): Resource | undefined {
  return published.find((item) => item.slug === slug);
}

export function getHotSearches(limit = 10): HotSearch[] {
  return HOT_SEARCHES.slice(0, limit);
}

/** 站内搜索：标题 / 简介 / 标签 / 作者（Phase 1 内存版） */
export function searchResources(keyword: string, categorySlug?: string): Resource[] {
  const q = keyword.trim().toLowerCase();
  let list = published;
  if (categorySlug) {
    const category = getCategory(categorySlug);
    list = list.filter(
      (item) =>
        item.categorySlug === (category?.slug ?? categorySlug) || item.subcategorySlug === categorySlug,
    );
  }
  if (!q) return list;
  return list.filter((item) =>
    [item.title, item.description, item.author, item.tags.join(" ")]
      .filter(Boolean)
      .some((field) => (field as string).toLowerCase().includes(q)),
  );
}

export function getStats() {
  return {
    resources: published.length,
    todayNew: 6,
    panLinks: published.reduce((sum, item) => sum + item.links.length, 0),
    categories: CATEGORIES.length,
  };
}
