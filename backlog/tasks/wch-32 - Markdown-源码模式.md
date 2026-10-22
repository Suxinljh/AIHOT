---
id: WCH-32
title: Markdown 源码模式
status: Done
assignee: []
created_date: '2026-10-21T03:12:00Z'
updated_date: '2026-10-22T04:45:00Z'
labels:
  - frontend
  - editor
milestone: m-4
dependencies:
  - WCH-21
priority: low
type: feature
ordinal: 44000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在 TipTap 编辑器中增加 Markdown 源码模式：可在富文本和 Markdown 之间转换，转换前提示可能丢失的样式；保留标题、段落、列表、加粗、链接和图片等支持范围。源码模式作为 P1 能力，不替代富文本默认编辑。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 可在富文本和 Markdown 之间切换并保存
- [x] #2 不支持或会丢失的样式在切换前提示
- [x] #3 Markdown 内容可继续导出和复制，不破坏正文数据
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. export.ts 增加 markdownToDoc（标题/段落/列表/引用/图片/加粗/斜体/删除线/代码/链接）。2. POST /api/studio/articles/:id/markdown 应用整篇源码。3. 文章页 Markdown tab：源码编辑、应用、丢失提示（来源引用/事实类型不可表示）。4. 单测覆盖往返与丢失检测。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
验证：export 单测 4/4（含 Markdown 往返与 losesEvidence）；typecheck、web 测试 21/21、npm test 644/644。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Markdown 源码模式完成：双向转换、应用保存、丢失提示；来源引用与事实类型在 Markdown 中不可表示，界面明确提示。
<!-- SECTION:FINAL_SUMMARY:END -->
