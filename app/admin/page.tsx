import Placeholder from "@/components/Placeholder";

export const metadata = { title: "后台管理", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <Placeholder
      icon="🔒"
      title="后台管理"
      desc="后台属于 Phase 4：资源 / 分类 / 标签 / 链接管理，投稿审核，Dashboard 统计（资源量、访问量、失效链接、待审核）。"
      bullets={["入口地址：/admin，须严格限制访问权限", "认证：Auth.js + RBAC，管理员开启 2FA"]}
    />
  );
}
