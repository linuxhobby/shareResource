import Placeholder from "@/components/Placeholder";

export const metadata = { title: "资源投稿" };

export default function SubmitPage() {
  return (
    <Placeholder
      icon="✉️"
      title="资源投稿"
      desc="用户投稿功能属于 Phase 6–7 规划：提交后进入待审核队列，管理员核对重复与链接有效性后发布。"
      bullets={[
        "提交内容：资源名称、分类、简介、夸克 / 百度链接、提取码、备注",
        "审核流程：待审核 → 重复检测 → 链接检测 → 编辑 → 发布",
        "在此之前，欢迎通过站点公告渠道推荐资源",
      ]}
    />
  );
}
