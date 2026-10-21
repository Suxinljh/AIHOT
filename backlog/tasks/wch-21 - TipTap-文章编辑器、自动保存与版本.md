---
id: WCH-21
title: TipTap 文章编辑器、自动保存与版本
status: To Do
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - frontend
  - editor
milestone: m-2
dependencies:
  - WCH-17
priority: high
type: feature
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
接入 TipTap，建立 /studio/articles/:id 编辑器：标题、正文、来源面板、自动保存、手动保存、历史版本列表与恢复。正文以受限文档 JSON 存储，作为后续排版和导出的唯一内容源；编辑器支持桌面和 375px。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 正文可编辑并自动保存，刷新后内容不丢
- [ ] #2 可查看历史版本并恢复到指定版本
- [ ] #3 来源面板始终可见，正文 JSON 可被排版视图复用
<!-- AC:END -->
