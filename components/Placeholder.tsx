import Link from "next/link";

interface Props {
  icon: string;
  title: string;
  desc: string;
  bullets?: string[];
}

export default function Placeholder({ icon, title, desc, bullets = [] }: Props) {
  return (
    <div className="container-x py-20">
      <div className="card mx-auto max-w-xl p-10 text-center">
        <span className="text-4xl">{icon}</span>
        <h1 className="mt-4 text-xl font-semibold text-white">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{desc}</p>
        {bullets.length > 0 && (
          <ul className="mx-auto mt-6 space-y-2 text-left text-sm text-slate-400">
            {bullets.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-star-light">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-white/10 px-5 py-2.5 text-sm text-white transition hover:bg-white/20"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
