---
id: WCH-31
title: 发布日历
status: Done
assignee: []
created_date: '2026-10-21T03:12:00Z'
updated_date: '2026-10-22T04:58:00Z'
labels:
  - frontend
milestone: m-4
dependencies:
  - WCH-17
  - WCH-21
priority: medium
type: feature
ordinal: 43000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 /studio/calendar：按计划发布日查看选题和稿件，支持拖拽或表单调整日期、设置状态、查看当天待办。日历只做计划，不自动发布到公众号。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 选题和稿件可分配计划日期并在日历中查看
- [x] #2 调整日期后选题/稿件状态和列表同步
- [x] #3 空月份、跨月和 375px 视图可用
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
验证：calendar 模块测试覆盖当月/跨月/清除/非法月份；calendar 页面测试覆盖桌面与空月份；typecheck、web 测试 23/23、npm test 646/646、迁移检查通过。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
发布日历完成：planned_for（选题+稿件）、按月 API、桌面日历与 375px 列表、就地改日期；只做排期，不自动发布。
<!-- SECTION:FINAL_SUMMARY:END -->
