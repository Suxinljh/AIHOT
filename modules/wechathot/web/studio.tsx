import type { MetaFunction } from "react-router";
import { IconFlame } from "@aihot/web/components/icons";
import { StudioPage } from "./studio-ui";
import { studioMeta } from "./studio-nav";

export const meta: MetaFunction = () => studioMeta("热点发现");

export default function StudioHotspots() {
  return (
    <StudioPage
      title="热点发现"
      description="跨行业聚合事件、推荐榜和关注更新。先看清发生了什么，再决定值不值得写。"
      icon={IconFlame}
      emptyTitle="还没有可用的热点事件"
      emptyBody="工作台已经连接。事件投影和首轮评分完成后，热点会按七个行业出现在这里。"
      stage="P0-A · 热点与信源"
    />
  );
}
