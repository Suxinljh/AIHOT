---
id: WCH-23
title: 排版视图、基础样式与预设
status: In Progress
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-22T02:20:00Z'
labels:
  - frontend
  - editor
milestone: m-3
dependencies:
  - WCH-21
priority: high
type: feature
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在文章编辑器内增加内容/排版双视图，共用同一份文档 JSON；支持正文与标题字体、字号、行高、段前段后、加粗、基础对齐和逐项覆盖。提供内置排版预设与自定义预设，应用预设后可继续修改。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 排版视图能修改字体、字号、行高、段距、加粗和对齐
- [ ] #2 预设可应用、保存和逐项覆盖，切换视图不丢内容
- [ ] #3 375px 下排版控件和预览可用
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 文章页增加 内容/排版 双视图切换，共用同一份文档 JSON。
2. 排版视图：正文与标题的字体、字号、行高、段距、加粗、对齐、图片圆角控件，写入 article.format（PATCH）。
3. 预设选择器：从 /api/studio/presets 读取 format 预设，应用后仍可逐项覆盖。
4. 375px 下控件可用（响应式 grid）。

风险：自动保存与布局保存共用 PATCH，避免并发覆盖。
<!-- SECTION:PLAN:END -->
