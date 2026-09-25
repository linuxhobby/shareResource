import Link from "next/link";
import type { Category } from "@/lib/types";

interface Props {
  category: Category;
  count: number;
}

export default function CategoryCard({ category, count }: Props) {
  return (
    <Link href={`/category/${category.slug}`} className="card card-hover group p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-white/10 to-white/[0.03] text-xl ring-1 ring-inset ring-white/10 transition group-hover:ring-star/40">
          {category.icon}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-medium text-slate-100 group-hover:text-white">
              {category.name}
            </h3>
            <span className="text-[11px] text-slate-500">{count} 个资源</span>
          </div>
          {category.children && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {category.children.slice(0, 4).map((child) => (
                <span key={child.slug} className="text-xs text-slate-400 transition group-hover:text-slate-300">
                  {child.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
