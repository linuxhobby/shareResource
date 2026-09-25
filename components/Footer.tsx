import Link from "next/link";
import { FRIEND_LINKS, NAV_CATEGORIES, SITE } from "@/lib/site";

const ABOUT_LINKS = [
  { name: "关于本站", href: "/about" },
  { name: "资源投稿", href: "/submit" },
  { name: "失效反馈", href: "/report" },
  { name: "RSS 订阅", href: "/feed.xml" },
  { name: "站点地图", href: "/sitemap.xml" },
];

export default function Footer() {
  return (
    <footer className="relative z-10 mt-20 border-t border-white/[0.06] bg-space-950/60">
      <div className="container-x py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1.6fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-gradient-to-br from-star to-baidu" />
              <span className="text-base font-semibold text-white">{SITE.name}</span>
              <span className="text-xs text-slate-500">{SITE.domain}</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
              {SITE.slogan}。收录影视、软件、办公模板、电子书、课程、素材与 AI 资源，
              统一检索后直达夸克 / 百度网盘。
            </p>
            <p className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs leading-relaxed text-slate-500">
              {SITE.notice}如涉及版权问题，请通过投诉渠道联系，我们将按「投诉 → 核实 → 下架 → 申诉」流程处理。
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-white">资源分类</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              {NAV_CATEGORIES.map((item) => (
                <li key={item.slug}>
                  <Link href={`/category/${item.slug}`} className="transition hover:text-white">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-white">友情链接</h3>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {FRIEND_LINKS.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="nofollow noopener"
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm text-slate-400 transition hover:border-star/40 hover:text-white"
                >
                  <span className="block text-slate-200">{link.name}</span>
                  {link.desc && <span className="text-xs text-slate-500">{link.desc}</span>}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-xs text-slate-500 sm:flex-row">
          <span>
            © {new Date().getFullYear()} {SITE.name} · {SITE.domain}
          </span>
          <div className="flex items-center gap-4">
            {ABOUT_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-slate-300">
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
