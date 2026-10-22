---
id: WCH-17
title: 选题看板与选题接口
status: Done
assignee:
  - '@agent'
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T08:54:00Z'
labels:
  - backend
  - frontend
milestone: m-2
dependencies:
  - WCH-2
  - WCH-9
priority: high
type: feature
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 wc_topics 的创建、查询、编辑和状态流转：待评估、待研究、待写作、写作中、已完成、已忽略、归档；保存事件 ID、角度、栏目、备注和创建时来源快照；同一事件再次创建时提示已有选题。提供 /studio/topics 看板与详情页，支持从事件详情创建选题。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 事件详情可创建选题，看板按状态展示并可流转
- [x] #2 选题保留来源快照，刷新事件不会静默改写已有选题
- [x] #3 同一事件重复创建有提示，不会无意识生成重复任务
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 新增 modules/wechathot/topics.ts：选题的创建、查询、编辑和状态流转（待评估→待研究→待写作→写作中→已完成，另有已忽略与归档），创建时把事件与来源写成快照。
2. 同一事件已有选题时，接口返回已有选题而不是默默再建一个；使用者确认后仍可再建。
3. 新增接口：GET/POST /api/studio/topics、PATCH /api/studio/topics/:id、GET /api/studio/topics/:id、POST /api/studio/topics/:id/refresh-snapshot，写审计日志。
4. 新增 /studio/topics 看板（按状态分列，桌面并排、手机堆叠）与 /studio/topics/:id 详情页；事件详情页可创建选题。
5. 补接口测试与页面测试，并用浏览器检查桌面和 375px。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现记录：
- 新增 modules/wechathot/topics.ts：选题的创建、查询、编辑、状态流转和来源快照；状态只能沿 待评估→待研究→待写作→写作中→已完成 前进，另有已忽略与归档，非法跳转返回可读错误。
- 创建选题时把事件标题、摘要、行业、品牌、推荐分和当时的报道列表写成快照（wc_topics.source_snapshot）；事件后来的新报道不会改写它，只有详情页的「刷新快照」才更新。
- 同一事件已有选题时，接口返回 409 并带上已有选题；使用者确认后带 force 仍可再建另一个角度，事件详情页的弹窗会先提示。
- 新增 /studio/topics 看板（按状态分列，桌面五列并排、手机按列堆叠）与 /studio/topics/:id 详情页（角度、栏目、备注、来源快照、事件信息、状态流转）。
- 接口：GET/POST /api/studio/topics、GET/PATCH /api/studio/topics/:id、POST /api/studio/topics/:id/refresh-snapshot，全部写审计日志。
- 修掉一个真实缺陷：编辑时用带外连接的查询加 FOR UPDATE，PostgreSQL 直接报错（500），改为先锁 wc_topics 自己的行再读视图。
- 验证：typecheck、@aihot/web build、wechathot 59/59 测试（新增 topics.test.ts 覆盖创建、重复提示、状态流转、编辑、快照不被改写与手动刷新、列表筛选、鉴权）；apps/web/tests/studio-topics.test.ts 覆盖看板与详情页；Playwright 在 1440px 与 375px 检查看板、详情页和事件页的创建弹窗，无横向溢出、无控制台错误，状态流转即时生效。检查用选题已清理。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成选题看板与接口：事件详情页可以创建选题（同一事件已有选题时会先提示，确认后仍可为另一个角度再建），/studio/topics 看板按待评估、待研究、待写作、写作中、已完成分列展示，另有已忽略与归档，卡片和详情页都能推进状态。

选题创建时会把事件标题、摘要、行业、品牌、推荐分和当时的报道列表写成来源快照；事件后来新增的报道不会静默改写这个快照，只有在详情页点「刷新快照」才会重新取一次证据。

验证：npm run typecheck；npm run build -w @aihot/web；wechathot 59/59 测试通过，新增 topics.test.ts 覆盖创建、重复提示、状态流转、编辑、快照不被改写与手动刷新和鉴权；apps/web/tests/studio-topics.test.ts 覆盖看板与详情页；Playwright 在 1440px 和 375px 检查看板、详情页与事件页弹窗，无横向溢出、无控制台错误。
<!-- SECTION:FINAL_SUMMARY:END -->
