import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import ResourceCard from "@/components/ResourceCard";
import { getCategories, getHotSearches, searchResources } from "@/lib/data";

export const metadata = {
  title: "资源搜索",
  description: "按关键词搜索电影、软件、办公模板、电子书、课程、素材与 AI 资源。",
};

interface Props {
  searchParams: Promise<{ q?: string; category?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", category } = await searchParams;
  const results = searchResources(q, category);
  const categories = getCategories();
  const hotSearches = getHotSearches(8);

  const buildHref = (slug?: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (slug) params.set("category", slug);
    const query = params.toString();
    return query ? `/search?${query}` : "/search";
  };

  return (
    <div className="container-x py-10">
      <div className="mx-auto max-w-3xl">
        <SearchBox defaultValue={q} autoFocusHotKey />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Link href={buildHref()} className={`chip ${!category ? "border-star/50 text-white" : ""}`}>
          全部
        </Link>
        {categories.map((item) => (
          <Link
            key={item.slug}
            href={buildHref(item.slug)}
            className={`chip ${category === item.slug ? "border-star/50 text-white" : "hover:border-star/50 hover:text-white"}`}
          >
            {item.name}
          </Link>
        ))}
      </div>

      <div className="mt-6 flex items-baseline justify-between">
        <h1 className="text-lg font-semibold text-white">
          {q ? `“${q}” 的搜索结果` : "全部资源"}
          <span className="ml-2 text-sm font-normal text-slate-500">共 {results.length} 条</span>
        </h1>
      </div>

      {results.length > 0 ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {results.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      ) : (
        <div className="card mt-5 p-10 text-center">
          <p className="text-slate-300">没有找到匹配的资源</p>
          <p className="mt-2 text-sm text-slate-500">换个关键词试试，或者从热门搜索开始：</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {hotSearches.map((item) => (
              <Link key={item.keyword} href={`/search?q=${encodeURIComponent(item.keyword)}`} className="chip hover:border-star/50 hover:text-white">
                {item.keyword}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
