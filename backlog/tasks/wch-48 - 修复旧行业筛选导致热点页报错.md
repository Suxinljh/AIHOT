---
id: WCH-48
title: 修复旧行业筛选导致热点页报错
status: Done
assignee: []
created_date: '2026-10-23T06:07:00Z'
updated_date: '2026-10-23T06:10:00Z'
labels:
  - frontend
  - backend
milestone: m-3
dependencies: []
priority: high
type: bug
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
旧分类 industry 仍出现在事件数据和筛选 facet 里，点击后 /?industry=industry 被接口拒绝，热点页显示加载失败。过滤合法分类、忽略旧 industry，并修正筛选跳转地址。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 旧 industry 链接不再让热点页报错
- [x] #2 行业筛选只显示当前 taxonomy 的分类
- [x] #3 筛选变更跳回根路由而不是 /studio
- [x] #4 补回归测试，typecheck 与测试通过
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 行业 facet 只输出合法 taxonomy key。
2. 接口忽略历史 industry key，但未知 key 仍返回 400。
3. 修复筛选跳转仍指向 /studio 的问题。
4. 补回归测试并验证 /?industry=industry。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
验证：/?industry=industry 返回 200，不再显示「热点列表加载失败」；行业 facet 只剩 hardware/film/software/embodied/ai-models/auto/game。真实未知行业仍返回 400。npm test 678/678。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
旧 industry 筛选不再让热点页报错；行业 facet 只显示当前分类，筛选跳转回到根路由。
<!-- SECTION:FINAL_SUMMARY:END -->
