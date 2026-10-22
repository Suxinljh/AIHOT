---
id: WCH-15
title: 站内通知与关注更新
status: Done
assignee:
  - '@agent'
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T08:32:00Z'
labels:
  - backend
  - frontend
milestone: m-1
dependencies:
  - WCH-4
  - WCH-12
priority: high
type: feature
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 /studio/alerts 与通知生成：新事件、关注品牌更新、采集错误；按品牌/渠道/事件类型规则匹配，同一事件多条更新合并为一条通知，记录触发和去重原因；支持单条/全部已读、静音和跳转事件。P0 只做站内通知。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 关注品牌达到规则后产生站内通知，可跳转到事件
- [x] #2 同一事件多条来源更新只产生一条通知
- [x] #3 采集失败通知可见，已读和静音状态持久化
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 扩展 wc_alerts：加 source_id，采集错误的通知能指到信源。
2. 新增 modules/wechathot/alerts.ts：按品牌关注规则匹配新事件，复用 WCH-12 的 followMatches；同一事件同一规则只留一条通知，后续更新合并进同一条；采集失败按信源去重，恢复后标记为已读。
3. 把通知生成挂到模块的定时任务（每 5 分钟），并新增接口 GET /api/studio/alerts、PATCH /api/studio/alerts/:id、POST /api/studio/alerts/read-all。
4. 新增 /studio/alerts 页面：按未读在前列出通知，可跳到事件，可单条已读/静音和全部已读；顶栏显示未读数。
5. 补接口与生成逻辑测试，并用浏览器检查。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现记录：
- wc_alerts 增加 source_id，采集失败的通知能指到信源（0152）。
- 新增 modules/wechathot/alerts.ts：按品牌关注规则匹配最近投影的事件，复用 WCH-12 的 followMatches 与静音判断；同一事件同一规则只留一条通知，后续更新并进同一条并改标为「关注更新」；采集失败按信源去重一条，信源恢复后该条转为已读并注明已恢复。
- 通知生成挂在模块的定时任务 wechathot.alerts.generate（每 5 分钟），与事件投影同一节奏。
- 接口 GET /api/studio/alerts、PATCH /api/studio/alerts/:id（已读/未读/静音）、POST /api/studio/alerts/read-all。
- 新增 /studio/alerts 页面：未读在前，可跳到事件或信源，可单条已读/静音和全部已读；顶栏显示未读数，通知页归属「热点发现」。
- 验证：typecheck、@aihot/web build、wechathot 47/47 测试（新增 alerts.test.ts 覆盖生成、去重合并、静音、采集失败与恢复、接口与状态持久化）；apps/web/tests/studio-alerts.test.ts 覆盖页面；Playwright 在 1440px 与 375px 检查通知页与顶栏未读数，无横向溢出、无控制台错误。测试期间在开发库里生成的关注与通知已清理。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成站内通知：关注品牌命中规则后，新事件会留下一条通知，可直接跳到事件页；同一事件的多次来源更新合并进同一条通知，不会刷屏；采集失败的信源各有一条通知，信源恢复后自动转为已读并注明已恢复。

通知生成挂在每 5 分钟的定时任务上，与事件投影同一节奏；规则、静音和屏蔽词沿用 WCH-12 存的那份设置。/studio/alerts 页面按未读在前列出通知，支持单条已读/未读/静音和全部已读，状态持久化在工作台的私有表里；顶栏显示未读数。

验证：npm run typecheck；npm run build -w @aihot/web；wechathot 47/47 测试通过，新增 alerts.test.ts 覆盖通知生成、去重合并、静音、采集失败与恢复以及接口状态；apps/web/tests/studio-alerts.test.ts 覆盖页面；Playwright 在 1440px 和 375px 检查通知页与顶栏未读数，无横向溢出、无控制台错误。
<!-- SECTION:FINAL_SUMMARY:END -->
