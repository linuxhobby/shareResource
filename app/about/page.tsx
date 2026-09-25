import Placeholder from "@/components/Placeholder";
import { SITE } from "@/lib/site";

export const metadata = { title: "关于本站" };

export default function AboutPage() {
  return (
    <Placeholder
      icon="🪐"
      title={SITE.name}
      desc={`${SITE.domain} 提供资源信息索引与第三方链接导航，原则上不直接存储任何资源文件。`}
      bullets={[
        "请仅收录你拥有合法分发权利的链接，并遵守各网盘平台服务条款",
        "涉及版权问题请通过投诉渠道联系，按「投诉 → 核实 → 下架 → 申诉」处理",
        "第一阶段支持夸克网盘与百度网盘，后续扩展更多网盘",
      ]}
    />
  );
}
