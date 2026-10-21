import type { MetaFunction } from "react-router";
import { IconList } from "@aihot/web/components/icons";
import { StudioPage } from "./studio-ui";
import { studioMeta } from "./studio-nav";

export const meta: MetaFunction = () => studioMeta("选题管理");

export default function StudioTopics() {
  return (
    <StudioPage
      title="选题管理"
      description="把值得写的事件变成有角度、有来源、有状态的创作任务。"
      icon={IconList}
      emptyTitle="还没有选题"
      emptyBody="从热点事件创建第一个选题后，这里会按待评估、待研究、待写作和已完成排列。"
      stage="P0-B · 选题与写作"
    />
  );
}
