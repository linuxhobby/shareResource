import SearchBox from "./SearchBox";
import { SITE } from "@/lib/site";

interface Props {
  hotKeywords: string[];
  stats: { resources: number; todayNew: number; panLinks: number };
}

export default function Hero({ hotKeywords, stats }: Props) {
  return (
    <section className="relative overflow-hidden pb-10 pt-14 sm:pb-14 sm:pt-20">
      <div className="pointer-events-none absolute left-1/2 top-6 h-64 w-64 -translate-x-1/2 rounded-full bg-star/20 blur-[100px]" />

      <div className="container-x relative text-center">
        <span className="chip mx-auto mb-6 border-star/30 bg-star/10 text-star-light">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          第一阶段：夸克 · 百度网盘直连
        </span>

        <h1 className="animate-float bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-6xl">
          {SITE.slogan}
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
          汇聚影视、软件、办公模板、电子书、课程、素材与 AI 资源，
          <span className="text-slate-300">统一检索、分类导航、一键直达网盘</span>
          。本站仅做索引，不存储任何文件。
        </p>

        <div className="mx-auto mt-8 max-w-3xl">
          <SearchBox hotKeywords={hotKeywords} autoFocusHotKey />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
          <span>
            收录资源 <b className="text-slate-200 tabular-nums">{stats.resources.toLocaleString()}</b>
          </span>
          <span className="hidden h-3 w-px bg-white/10 sm:block" />
          <span>
            今日新增 <b className="text-slate-200 tabular-nums">{stats.todayNew}</b>
          </span>
          <span className="hidden h-3 w-px bg-white/10 sm:block" />
          <span>
            网盘直链 <b className="text-slate-200 tabular-nums">{stats.panLinks}</b>
          </span>
        </div>
      </div>
    </section>
  );
}
