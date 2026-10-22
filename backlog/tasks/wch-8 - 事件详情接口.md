---
id: WCH-8
title: 事件详情接口
status: Done
assignee:
  - '@agent'
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T07:38:00Z'
labels:
  - backend
  - api
milestone: m-1
dependencies:
  - WCH-2
  - WCH-4
priority: high
type: feature
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 /api/studio/events/:publicId：返回事件综述、时间线、原始报道、事实证据、品牌、分类、核实状态、热度、新闻价值、选题推荐分及解释；同时返回已读、收藏、忽略等私有状态。只读复用 publication 的事件读取能力，不把 wc_ 数据写进公开层。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 能按 publicId 读取完整事件详情，字段与列表页一致
- [x] #2 合并事件后仍能打开，并保留来源与状态
- [x] #3 不存在的 id 返回 404；非管理员返回未授权
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 新增 modules/wechathot/event-detail.ts：按 publicId 解析存活事件（合并链与旧别名都能打开），复用 publication 的 loadStoryDetail 取综述、时间线、事实、热度，并合并 wc_event_meta 的分类、品牌、核实状态、热度、新闻价值与选题推荐分及解释。
2. 补充 wc_event_states 私有状态与 wc_topics 选题列表、品牌关注状态；报告补原始链接。
3. 新增 PATCH /api/studio/events/:publicId/state 处理已读、收藏、忽略、关注后续和人工决策，写审计日志。
4. 在 server.ts 注册 GET /api/studio/events/:publicId 与状态写入路由，沿用管理员会话和 no-store。
5. 补接口测试：正常读取、合并后打开、404、未授权与状态写入。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现记录：
- event-detail.ts 用 publicId 解析存活事件：合并链与 story_aliases 都能打开，返回存活事件的 publicId 并在 mergedFrom 标出原 id。
- 事件内容复用 publication 的 loadStoryDetail（综述、事实、时间线、热度曲线、为何上热），工作台另查 wc_ 的分类、品牌、核实状态、新闻价值、选题推荐分与解释、选题列表和私有状态；报告补原始链接。
- 新增 PATCH /api/studio/events/:publicId/state：已读、收藏、忽略、关注后续和人工决策，写 wc_event_states 并记审计。状态写入接口放在本任务，因为状态本身是事件私有数据。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成 /api/studio/events/:publicId：按 publicId 返回事件综述、摘要、事实与时间线、原始报道（含原文链接）、品牌与分类、核实状态、热度、新闻价值、选题推荐分与解释，以及已读/收藏/忽略/关注后续/人工决策和选题列表。事件内容只读复用 publication 的 loadStoryDetail，工作台数据仍只来自 wc_ 表。

合并后的事件按存活事件打开并标出 mergedFrom，原 id 和别名都能解析；不存在的 id 和非法 id 返回 404，非管理员返回 401，响应 no-store。

另加 PATCH /api/studio/events/:publicId/state 处理编辑自己的决定，写入 wc_event_states 并记审计日志，供 WCH-9 的详情页使用。

验证：npm run typecheck；wechathot 29/29 测试通过，覆盖详情字段、合并后打开、404/未授权和状态写入。
<!-- SECTION:FINAL_SUMMARY:END -->
