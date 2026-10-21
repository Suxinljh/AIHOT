import type { MetaFunction } from "react-router";
import { IconDoc } from "@aihot/web/components/icons";
import { StudioPage } from "./studio-ui";
import { studioMeta } from "./studio-nav";

export const meta: MetaFunction = () => studioMeta("我的文章");

export default function StudioArticles() {
  return (
    <StudioPage
      title="我的文章"
      description="资讯与洞察草稿、写作进度和排版入口集中在这里。"
      icon={IconDoc}
      emptyTitle="还没有文章"
      emptyBody="选题进入写作后，生成的角度、大纲和正文会保存在这里，随时可以继续修改。"
      stage="P0-B / P0-C · 写作与排版"
    />
  );
}
