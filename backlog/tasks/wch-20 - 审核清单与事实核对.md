---
id: WCH-20
title: 审核清单与事实核对
status: To Do
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - backend
  - ai
  - frontend
milestone: m-2
dependencies:
  - WCH-19
priority: high
type: feature
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 review 步骤与审核面板：列出关键事实、数字、日期、来源和潜在夸大表述，标记未核实项和缺失来源；用户可以逐项确认、修改或忽略，审核结果单独存储，不混入正文。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 每篇稿件可生成审核清单并显示风险项
- [ ] #2 审核项可人工确认、修改和忽略，状态持久化
- [ ] #3 审核不通过时保留草稿，不阻止用户继续编辑
<!-- AC:END -->
