import Placeholder from "@/components/Placeholder";

export const metadata = { title: "失效反馈" };

export default function ReportPage() {
  return (
    <Placeholder
      icon="🛠️"
      title="失效反馈"
      desc="链接检测与举报系统在 Phase 6 上线：定时巡检每条网盘链接，标记为 🟢 正常 / 🟡 未检测 / 🔴 失效。"
      bullets={["举报类型：链接失效 / 信息错误 / 重复资源 / 侵权投诉 / 其他", "处理流程：提交 → 核实 → 更新或下架 → 回复"]}
    />
  );
}
