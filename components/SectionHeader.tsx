import Link from "next/link";

interface Props {
  title: string;
  subtitle?: string;
  moreHref?: string;
  moreText?: string;
}

export default function SectionHeader({ title, subtitle, moreHref, moreText = "查看更多" }: Props) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-wide text-white sm:text-xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {moreHref && (
        <Link href={moreHref} className="shrink-0 text-sm text-slate-400 transition hover:text-white">
          {moreText} →
        </Link>
      )}
    </div>
  );
}
