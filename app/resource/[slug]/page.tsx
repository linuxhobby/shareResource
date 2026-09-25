import Link from "next/link";
import { notFound } from "next/navigation";
import Cover from "@/components/Cover";
import ResourceCard from "@/components/ResourceCard";
import { getCategory, getResourceBySlug, searchResources } from "@/lib/data";
import { formatViews, relativeTime } from "@/lib/format";
import { LINK_STATUS_MAP, getPan } from "@/lib/pan";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const resource = getResourceBySlug(slug);
  if (!resource) return { title: "资源不存在" };
  return {
    title: `${resource.title} 网盘资源`,
    description: resource.description?.slice(0, 120),
  };
}

export default async function ResourcePage({ params }: Props) {
  const { slug } = await params;
  const resource = getResourceBySlug(slug);
  if (!resource) notFound();

  const category = getCategory(resource.categorySlug);
  const related = searchResources("", resource.categorySlug)
    .filter((item) => item.id !== resource.id)
    .slice(0, 5);

  const info = [
    { label: "分类", value: category?.name },
    { label: "年份", value: resource.year },
    { label: "地区", value: resource.region },
    { label: "清晰度", value: resource.quality },
    { label: "版本", value: resource.version },
    { label: "语言", value: resource.language },
    { label: "大小", value: resource.size },
    { label: "更新", value: relativeTime(resource.updatedAt) },
  ].filter((item) => item.value) as Array<{ label: string; value: string | number }>;

  return (
    <div className="container-x py-10">
      <nav className="text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">首页</Link>
        <span className="mx-2">/</span>
        <Link href={`/category/${resource.categorySlug}`} className="hover:text-slate-300">
          {category?.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300">{resource.title}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Cover
          title={resource.title}
          icon={category?.icon}
          image={resource.coverUrl}
          className="aspect-[3/4] w-full rounded-2xl lg:aspect-[3/4]"
        />

        <div>
          <h1 className="text-2xl font-semibold leading-snug text-white sm:text-3xl">{resource.title}</h1>
          <p className="mt-3 text-sm text-slate-400">
            {[resource.year, resource.quality, resource.language, resource.size].filter(Boolean).join(" ｜ ")}
          </p>

          {resource.description && (
            <p className="mt-5 text-[15px] leading-relaxed text-slate-300">{resource.description}</p>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm sm:grid-cols-3">
            {info.map((item) => (
              <div key={item.label}>
                <dt className="text-xs text-slate-500">{item.label}</dt>
                <dd className="mt-0.5 text-slate-200">{item.value}</dd>
              </div>
            ))}
          </dl>

          {resource.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {resource.tags.map((tag) => (
                <Link key={tag} href={`/search?q=${encodeURIComponent(tag)}`} className="chip hover:border-star/50 hover:text-white">
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-7">
            <h2 className="text-sm font-medium text-white">网盘下载</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {resource.links.map((link) => {
                const pan = getPan(link.panType);
                const status = LINK_STATUS_MAP[link.status];
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="nofollow noopener"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 transition hover:-translate-y-0.5 hover:border-star/40 hover:shadow-glow"
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: pan.color }} />
                      <span className="text-sm text-slate-100">{pan.name}</span>
                      <span className={`text-[11px] ${status.text}`}>{status.label}</span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {link.password ? `提取码 ${link.password}` : "打开资源 →"}
                    </span>
                  </a>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              本站仅提供第三方网盘链接导航，不存储任何文件；链接失效可通过「失效反馈」告诉我们。
            </p>
          </div>

          <div className="mt-6 flex items-center gap-6 text-sm text-slate-500">
            <span>{formatViews(resource.views)} 浏览</span>
            <span>{resource.likes} 有用</span>
            <Link href="/report" className="hover:text-slate-300">失效反馈</Link>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold text-white">相关推荐</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {related.map((item) => (
              <ResourceCard key={item.id} resource={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
