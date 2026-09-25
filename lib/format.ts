export function formatViews(views: number): string {
  if (views >= 10000) return `${(views / 10000).toFixed(1)} 万`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}k`;
  return String(views);
}

export function relativeTime(date: string, now = Date.parse("2026-09-25")): string {
  const diff = now - Date.parse(date);
  const day = 86400000;
  if (Number.isNaN(diff)) return date;
  if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`;
  if (diff < day) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  if (diff < 365 * day) return `${Math.floor(diff / (30 * day))} 个月前`;
  return `${Math.floor(diff / (365 * day))} 年前`;
}

export function joinMeta(items: Array<string | number | undefined>): string {
  return items.filter((item) => item !== undefined && item !== "").join(" · ");
}
