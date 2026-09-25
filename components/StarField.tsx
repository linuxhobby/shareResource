const STARS = (() => {
  // 固定种子，保证服务端与客户端渲染一致（避免 hydration 警告）
  let seed = 20260925;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  return Array.from({ length: 70 }, () => ({
    top: `${rand() * 100}%`,
    left: `${rand() * 100}%`,
    size: 1 + rand() * 2,
    delay: `${rand() * 4}s`,
    duration: `${3 + rand() * 4}s`,
  }));
})();

export default function StarField() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {STARS.map((star, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            animationDelay: star.delay,
            animationDuration: star.duration,
          }}
        />
      ))}
    </div>
  );
}
