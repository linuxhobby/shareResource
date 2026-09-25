import Link from "next/link";
import Hero from "@/components/Hero";
import SectionHeader from "@/components/SectionHeader";
import CategoryCard from "@/components/CategoryCard";
import ResourceCard from "@/components/ResourceCard";
import ResourceRow from "@/components/ResourceRow";
import { countByCategory, getCategories, getHotResources, getHotSearches, getLatestResources, getStats } from "@/lib/data";
import { formatViews } from "@/lib/format";
import { FRIEND_LINKS } from "@/lib/site";

export default function HomePage() {
  const categories = getCategories();
  const latest = getLatestResources(12);
  const hot = getHotResources(10);
  const hotSearches = getHotSearches(8);
  const stats = getStats();

  return (
    <>
      <Hero hotKeywords={hotSearches.slice(0, 6).map((item) => item.keyword)} stats={stats} />

      {/* 热门分类 */}
      <section className="container-x py-6 sm:py-10">
        <SectionHeader title="热门分类" subtitle="8 大资源版块，支持无限级细分" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category.slug} category={category} count={countByCategory(category.slug)} />
          ))}
        </div>
      </section>

      {/* 最新资源 + 热门榜单 */}
      <section className="container-x py-6 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <SectionHeader
              title="最新收录"
              subtitle="持续整理更新，点击进入查看资源信息与网盘入口"
              moreHref="/search?sort=latest"
              moreText="全部资源"
            />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
              {latest.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="card p-4">
              <SectionHeader title="🔥 热门资源 TOP 10" />
              <div className="-mx-2">
                {hot.map((resource, index) => (
                  <ResourceRow key={resource.id} resource={resource} rank={index + 1} />
                ))}
              </div>
            </div>

            <div className="card p-4">
              <SectionHeader title="热门搜索" subtitle={`${formatViews(92000)} 次搜索 / 月`} />
              <ol className="space-y-1.5">
                {hotSearches.map((item, index) => (
                  <li key={item.keyword}>
                    <Link
                      href={`/search?q=${encodeURIComponent(item.keyword)}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition hover:bg-white/[0.04]"
                    >
                      <span
                        className={`w-4 text-center text-xs font-semibold tabular-nums ${
                          index < 3 ? "text-star-light" : "text-slate-600"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="flex-1 truncate text-slate-300">{item.keyword}</span>
                      <span className="text-[11px] tabular-nums text-slate-600">
                        {item.trend === "up" ? "↑" : item.trend === "down" ? "↓" : "–"}
                        {formatViews(item.count)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-medium text-white">发现失效链接或好资源？</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                提交资源或反馈失效链接，我们会核对后尽快更新，保持每一条链接可用。
              </p>
              <div className="mt-4 flex gap-2">
                <Link
                  href="/submit"
                  className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-center text-sm text-white transition hover:bg-white/20"
                >
                  资源投稿
                </Link>
                <Link
                  href="/report"
                  className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-center text-sm text-slate-300 transition hover:border-white/25 hover:text-white"
                >
                  失效反馈
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* 友情链接 */}
      <section className="container-x py-6 sm:py-10">
        <SectionHeader title="友情链接" subtitle="网盘入口与常用渠道" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {FRIEND_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="nofollow noopener"
              className="card card-hover flex flex-col items-center gap-1 px-3 py-4 text-center"
            >
              <span className="text-sm text-slate-200">{link.name}</span>
              <span className="text-[11px] text-slate-500">{link.desc}</span>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
