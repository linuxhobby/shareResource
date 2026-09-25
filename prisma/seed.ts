import { PrismaClient } from "@prisma/client";
import { CATEGORIES, RESOURCES } from "../lib/mock";

const prisma = new PrismaClient();

export function toSlug(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `x-${Buffer.from(input).toString("hex").slice(0, 8)}`;
}

async function main() {
  // 清空：开发阶段种子数据可重复执行
  await prisma.resourceTag.deleteMany();
  await prisma.resourceLink.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();

  // 一级分类 + 二级分类（二级 slug 与父级冲突时跳过，如 影视/电影）
  for (const parent of CATEGORIES) {
    const created = await prisma.category.create({
      data: {
        name: parent.name,
        slug: parent.slug,
        icon: parent.icon,
        sortOrder: parent.sortOrder,
        parentId: null,
      },
    });

    for (const [index, child] of (parent.children ?? []).entries()) {
      if (child.slug === parent.slug) continue;
      await prisma.category.create({
        data: {
          name: child.name,
          slug: child.slug,
          parentId: created.id,
          sortOrder: index + 1,
        },
      });
    }
  }

  const categoryMap = new Map((await prisma.category.findMany()).map((c) => [c.slug, c.id]));

  // 标签去重后统一建表
  const tagMap = new Map<string, number>();
  for (const resource of RESOURCES) {
    for (const name of resource.tags) {
      const key = name.trim();
      if (!key || tagMap.has(key)) continue;
      const slug = toSlug(key);
      const tag = await prisma.tag.upsert({
        where: { slug },
        update: {},
        create: { name: key, slug },
      });
      tagMap.set(key, tag.id);
    }
  }

  for (const item of RESOURCES) {
    const categoryId = categoryMap.get(item.categorySlug);
    if (!categoryId) {
      console.warn(`跳过资源「${item.title}」：未找到分类 ${item.categorySlug}`);
      continue;
    }

    await prisma.resource.create({
      data: {
        title: item.title,
        slug: item.slug,
        categoryId,
        description: item.description,
        coverUrl: item.coverUrl ?? null,
        year: item.year ?? null,
        region: item.region ?? null,
        language: item.language ?? null,
        quality: item.quality ?? null,
        size: item.size ?? null,
        version: item.version ?? null,
        author: item.author ?? null,
        status: item.status,
        views: item.views,
        likes: item.likes,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        tags: {
          create: item.tags
            .map((name) => tagMap.get(name.trim()))
            .filter((id): id is number => Boolean(id))
            .map((tagId) => ({ tagId })),
        },
        links: {
          create: item.links.map((link) => ({
            panType: link.panType,
            url: link.url,
            password: link.password ?? null,
            status: link.status,
          })),
        },
      },
    });
  }

  const counts = {
    categories: await prisma.category.count(),
    resources: await prisma.resource.count(),
    tags: await prisma.tag.count(),
    links: await prisma.resourceLink.count(),
  };
  console.log("种子数据写入完成：", counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
