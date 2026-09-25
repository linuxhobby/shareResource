import type { LinkStatus, PanType } from "./types";

export interface PanMeta {
  name: string;
  short: string;
  /** 圆点颜色 */
  color: string;
  /** 渐变按钮样式 */
  badge: string;
}

/** 网盘元信息：新增网盘只需在此处追加一行（PROJECT_PLAN §4.7） */
export const PAN_MAP: Record<PanType, PanMeta> = {
  quark: {
    name: "夸克网盘",
    short: "夸克",
    color: "#4f7bff",
    badge: "bg-quark/15 text-quark ring-1 ring-quark/30 hover:bg-quark/25",
  },
  baidu: {
    name: "百度网盘",
    short: "百度",
    color: "#3aa0ff",
    badge: "bg-baidu/15 text-baidu ring-1 ring-baidu/30 hover:bg-baidu/25",
  },
  aliyun: {
    name: "阿里云盘",
    short: "阿里",
    color: "#ff6a3d",
    badge: "bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/30 hover:bg-orange-500/25",
  },
  uc: {
    name: "UC 网盘",
    short: "UC",
    color: "#8b5cf6",
    badge: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/30 hover:bg-violet-500/25",
  },
  "115": {
    name: "115 网盘",
    short: "115",
    color: "#22c55e",
    badge: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30 hover:bg-emerald-500/25",
  },
  "123pan": {
    name: "123 云盘",
    short: "123",
    color: "#eab308",
    badge: "bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-400/30 hover:bg-yellow-500/25",
  },
};

export const LINK_STATUS_MAP: Record<LinkStatus, { label: string; dot: string; text: string }> = {
  active: { label: "正常", dot: "bg-emerald-400", text: "text-emerald-400" },
  unknown: { label: "未检测", dot: "bg-amber-400", text: "text-amber-400" },
  expired: { label: "已失效", dot: "bg-rose-500", text: "text-rose-400" },
  blocked: { label: "已屏蔽", dot: "bg-rose-500", text: "text-rose-400" },
};

export function getPan(type: PanType): PanMeta {
  return PAN_MAP[type] ?? PAN_MAP.quark;
}
