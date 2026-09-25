import { notFound } from "next/navigation";
import Link from "next/link";
import ResourceCard from "@/components/ResourceCard";
import { getCategories, getCategory, searchResources } from "@/lib/data";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const resources = searchResources("", slug);
  const categories = getCategories();

  return (
    <div className="container-x py-10">
      <nav className="text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-300">首页</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300">{category.name}</span>
      </nav>

      <div className="mt-4 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/[0.06] text-2xl ring-1 ring-inset ring-white/10">
          {category.icon}
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-white">{category.name}</h1>
          <p className="text-sm text-slate-500">共 {resources.length} 个资源 · 支持夸克 / 百度网盘转存</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {categories.map((item) => (
          <Link
            key={item.slug}
            href={`/category/${item.slug}`}
            className={`chip ${item.slug === slug ? "border-star/50 text-white" : "hover:border-star/50 hover:text-white"}`}
          >
            {item.name}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {resources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>
    </div>
  );
}
