---
id: WCH-47
title: 设置页按步骤选择模型
status: Done
assignee: []
created_date: '2026-10-23T05:32:00Z'
updated_date: '2026-10-23T05:35:00Z'
labels:
  - frontend
milestone: m-3
dependencies: []
priority: high
ordinal: 54000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
工作台设置页增加模型卡片，直接为预筛、评分、理解、摘要、结构、归组、翻译等步骤选择模型；沿用后台已有的 models.* 设置和审计，只影响之后的新任务。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 设置页列出每个模型步骤的当前模型和来源
- [x] #2 每个步骤可以切换模型或恢复默认
- [x] #3 切换走现有审计接口，未知/不支持视觉的模型被拒绝
- [x] #4 typecheck、web 构建与测试通过
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 设置页 loader 读取 /api/admin/models。
2. 新增模型卡片：每个步骤显示当前模型和来源，可切换或恢复默认。
3. 复用现有审计接口，标注约 1 分钟生效。
4. 补 web 测试并跑全量检查。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
设置页新增「模型」卡片，列出所有模型步骤、当前模型/来源、可切换或恢复默认；保存走 /api/admin/models/:key，带审计原因「工作台设置页切换模型」，模型缓存 60 秒后生效，无需重启。web 测试 25/25，npm test 677/677。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
工作台设置页可按步骤选择模型，沿用后台的 models.* 设置和审计。
<!-- SECTION:FINAL_SUMMARY:END -->
