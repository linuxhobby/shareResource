import type { ResourceLink } from "@/lib/types";
import { LINK_STATUS_MAP, getPan } from "@/lib/pan";

interface Props {
  links: ResourceLink[];
  /** card：卡片内小徽章；detail：详情页大按钮（暂用于卡片悬浮） */
  size?: "sm" | "md";
}

export default function PanBadges({ links, size = "sm" }: Props) {
  if (!links.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {links.map((link) => {
        const pan = getPan(link.panType);
        const status = LINK_STATUS_MAP[link.status];
        return (
          <span
            key={link.id}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${pan.badge} ${
              size === "md" ? "px-3 py-1.5 text-sm" : ""
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {pan.short}
          </span>
        );
      })}
    </div>
  );
}
