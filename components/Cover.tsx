const GRADIENTS = [
  "from-indigo-500/70 via-violet-600/60 to-slate-900",
  "from-sky-500/70 via-blue-600/60 to-slate-900",
  "from-emerald-500/70 via-teal-600/60 to-slate-900",
  "from-amber-500/70 via-orange-600/60 to-slate-900",
  "from-rose-500/70 via-pink-600/60 to-slate-900",
  "from-cyan-500/70 via-indigo-600/60 to-slate-900",
];

function hash(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

interface Props {
  title: string;
  icon?: string;
  image?: string;
  className?: string;
}

/** 资源封面：有图用图，无图用确定性渐变形封面，避免任何外链依赖 */
export default function Cover({ title, icon = "📦", image, className = "" }: Props) {
  const gradient = GRADIENTS[hash(title) % GRADIENTS.length];

  return (
    <div className={`relative overflow-hidden bg-space-850 ${className}`}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={title} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className={`grid h-full w-full place-items-center bg-gradient-to-br ${gradient}`}>
          <span className="text-4xl drop-shadow-lg sm:text-5xl">{icon}</span>
          <span className="absolute bottom-2 right-3 max-w-[85%] truncate text-[11px] font-medium text-white/70">
            {title}
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-space-950/80 via-transparent to-transparent" />
    </div>
  );
}
