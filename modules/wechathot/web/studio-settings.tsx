import type { MetaFunction } from "react-router";
import { IconGrid } from "@aihot/web/components/icons";
import { StudioPage } from "./studio-ui";
import { studioMeta } from "./studio-nav";

export const meta: MetaFunction = () => studioMeta("设置");

export default function StudioSettings() {
  return (
    <StudioPage
      title="设置"
      description="AI 模型、评分偏好、采集通知和文章风格。"
      icon={IconGrid}
      emptyTitle="设置页正在接入"
      emptyBody="模型、评分偏好与通知配置会逐步放进这里；当前先沿用管理员后台的设置。"
      stage="P0 · 设置"
    />
  );
}
