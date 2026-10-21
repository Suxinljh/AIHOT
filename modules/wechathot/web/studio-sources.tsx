import type { MetaFunction } from "react-router";
import { IconPlug } from "@aihot/web/components/icons";
import { StudioPage } from "./studio-ui";
import { studioMeta } from "./studio-nav";

export const meta: MetaFunction = () => studioMeta("关注与信源");

export default function StudioSources() {
  return (
    <StudioPage
      title="关注与信源"
      description="关注品牌、管理渠道，并检查每个信源的采集健康状态。"
      icon={IconPlug}
      emptyTitle="还没有关注品牌或信源"
      emptyBody="添加品牌，或接入 RSS、官网和 GitHub Release 后，采集状态与最近更新会显示在这里。"
      stage="P0-A · 关注与信源"
    />
  );
}
