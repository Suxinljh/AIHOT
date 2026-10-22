---
id: WCH-9
title: 事件详情页与事件状态操作
status: Done
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T07:45:00Z'
labels:
  - frontend
milestone: m-1
dependencies:
  - WCH-8
priority: high
type: feature
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 /studio/events/:publicId：展示摘要、时间线、原始报道、事实、评分解释和品牌；支持已读、收藏、忽略、关注后续等操作，并在列表页同步。暂不包含创建选题，入口在 P0-B 接入。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 详情页信息完整，时间线与原始报道可展开
- [x] #2 状态操作立即生效，返回列表后保持一致
- [x] #3 375px 下阅读和操作可用
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现记录：
- 新增 /studio/events/:publicId 页面与模块路由；顶栏归属「热点发现」，与 /studio/brands 一样不新增一级入口。
- 页面分区：事件头部（标题、行业、事件类型、核实状态、已更新、摘要、首发/最近更新/条目数/主要来源）、状态操作条（已读、收藏、忽略、关注后续、人工判断）、时间线与原始报道（摘要可展开、原文链接）、事实与证据、三套分数与解释、品牌、已有选题、为什么上热。
- 状态操作走 PATCH /api/studio/events/:publicId/state，成功后 revalidate，列表再次进入时读到同样的状态。
- 未知事件由页面自己的 ErrorBoundary 呈现「这个事件不存在」和回到热点发现的入口。
- 验证：npm run typecheck；@aihot/web build；新增 apps/web/tests/studio-event.test.ts 用合成 api 断言页面内容与 404；Playwright 在 1440px 和 375px 打开真实数据页面，无横向溢出、无控制台错误，收藏/取消收藏即时生效。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成 /studio/events/:publicId：事件详情页展示标题、行业与事件类型、核实状态、摘要、首发与最近更新时间、聚合条目与主要来源，下面是时间线与原始报道（摘要可展开、可打开原文）、事实与证据、三套分数与推荐理由、品牌、已有选题和为什么上热。

支持已读、收藏、忽略、关注后续和人工判断（推荐/忽略/稍后/已报道），写入 PATCH /api/studio/events/:publicId/state 并即时反映在页面上；未知事件显示「这个事件不存在」和返回入口。页面归属「热点发现」，不新增一级导航。

验证：npm run typecheck；npm run build -w @aihot/web；新增 apps/web/tests/studio-event.test.ts 覆盖页面内容与 404；Playwright 在 1440px 和 375px 检查真实数据页面，无横向溢出、无控制台错误，状态操作即时生效。
<!-- SECTION:FINAL_SUMMARY:END -->
