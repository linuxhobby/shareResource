import Link from "next/link";
import Cover from "./Cover";
import PanBadges from "./PanBadges";
import { getCategory } from "@/lib/data";
import { formatViews, joinMeta, relativeTime } from "@/lib/format";
import type { Resource } from "@/lib/types";

export default function ResourceCard({ resource }: { resource: Resource }) {
  const category = getCategory(resource.categorySlug);
  const { title, slug, description, tags, links, views, createdAt } = resource;

  return (
    <Link href={`/resource/${slug}`} className="card card-hover group flex flex-col overflow-hidden">
      <Cover
        title={title}
        icon={category?.icon}
        image={resource.coverUrl}
        className="aspect-[4/3] w-full"
      />

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-2 text-[15px] font-medium leading-snug text-slate-100 transition group-hover:text-white">
          {title}
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          {joinMeta([resource.year, resource.quality ?? resource.version, resource.size]) || "资源详情"}
        </p>

        {description && (
          <p className="line-2 mt-2 text-[13px] leading-relaxed text-slate-400">{description}</p>
        )}

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="chip px-2 py-0.5 text-[11px]">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
          <PanBadges links={links} />
          <span className="shrink-0 text-[11px] text-slate-500">
            {formatViews(views)} 浏览 · {relativeTime(createdAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
