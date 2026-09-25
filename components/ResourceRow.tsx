import Link from "next/link";
import Cover from "./Cover";
import { getCategory } from "@/lib/data";
import { formatViews, joinMeta } from "@/lib/format";
import type { Resource } from "@/lib/types";

export default function ResourceRow({ resource, rank }: { resource: Resource; rank: number }) {
  const category = getCategory(resource.categorySlug);

  return (
    <Link
      href={`/resource/${resource.slug}`}
      className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/[0.04]"
    >
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-semibold tabular-nums ${
          rank <= 3 ? "bg-star/20 text-star-light" : "bg-white/5 text-slate-500"
        }`}
      >
        {rank}
      </span>
      <Cover
        title={resource.title}
        icon={category?.icon}
        image={resource.coverUrl}
        className="h-12 w-12 shrink-0 rounded-lg sm:h-14 sm:w-14"
      />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm text-slate-200 transition group-hover:text-white">
          {resource.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {joinMeta([resource.year, resource.quality ?? resource.version, resource.size])}
        </p>
      </div>
      <span className="shrink-0 text-xs tabular-nums text-slate-500">{formatViews(resource.views)}</span>
    </Link>
  );
}
