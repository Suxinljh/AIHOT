---
id: WCH-20
title: 审核清单与事实核对
status: In Progress
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-22T02:09:00Z'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. `wc_articles.review` 已有 jsonb 列，用它单独存储审核清单，不混入正文。
2. prompts-body.ts 新增审核提示词：列出关键事实、数字、日期、来源与潜在夸大表述，标记未核实项与缺失来源。
3. articles.ts：generateReview（模型调用→校验→写入 review）、updateReview（状态确认/修改/忽略），StudioArticle 加 review 字段。
4. server.ts：POST /api/studio/articles/:id/review（同步生成）、PATCH 更新审核项状态；Zod 校验。
5. studio-article.tsx：审核清单面板，逐项确认/修改/忽略，状态持久化。
6. articles.test.ts：生成、状态更新、审核不通过时草稿保留。

风险：模型调用可能失败，失败时保留原草稿（AC3）；审核清单与正文版本不同步时只作参考。
<!-- SECTION:PLAN:END -->
