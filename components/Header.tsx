import Link from "next/link";
import { NAV_CATEGORIES, SITE } from "@/lib/site";

function Logo() {
  return (
    <Link href="/" className="group flex shrink-0 items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center">
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-star via-violet-500 to-baidu opacity-90 blur-[1px]" />
        <span className="absolute inset-[2px] rounded-full bg-space-950" />
        <span className="absolute h-1.5 w-1.5 rounded-full bg-white/90 shadow-[0_0_10px_2px_rgba(255,255,255,.6)]" />
        <span className="absolute h-7 w-7 rounded-full ring-1 ring-inset ring-white/20" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-wide text-white">{SITE.name}</span>
        <span className="text-[10px] tracking-[.18em] text-slate-500">{SITE.domain}</span>
      </span>
    </Link>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-space-950/70 backdrop-blur-xl">
      <div className="container-x flex h-16 items-center gap-4">
        <Logo />

        <nav className="no-scrollbar ml-2 hidden flex-1 items-center gap-1 overflow-x-auto md:flex">
          {NAV_CATEGORIES.map((item) => (
            <Link
              key={item.slug}
              href={`/category/${item.slug}`}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/submit"
            className="hidden rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:border-star/50 hover:text-white sm:block"
          >
            投稿
          </Link>
          <Link
            href="/admin"
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-400 transition hover:border-white/25 hover:text-white"
          >
            后台
          </Link>
        </div>
      </div>

      <nav className="no-scrollbar flex items-center gap-1 overflow-x-auto border-t border-white/[0.06] px-4 py-2 md:hidden">
        {NAV_CATEGORIES.map((item) => (
          <Link
            key={item.slug}
            href={`/category/${item.slug}`}
            className="whitespace-nowrap rounded-full px-3 py-1 text-sm text-slate-300"
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </header>
  );
}
