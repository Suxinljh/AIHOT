---
id: WCH-21
title: TipTap 文章编辑器、自动保存与版本
status: In Progress
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-22T02:16:00Z'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 安装 @tiptap/react、@tiptap/starter-kit、@tiptap/pm（apps/web）。
2. 新建 studio-article-editor.tsx：基于 TipTap 的富文本编辑器，读写 ArticleDoc（heading/paragraph + attrs.kind/sources）。
3. studio-article.tsx 用编辑器替换正文只读视图；自动保存（防抖 1.5s）走 PATCH /api/studio/articles/:id，失败保留本地内容。
4. 版本：每次保存 bump version，历史列表可回看（只读）。
5. tests：web 层至少 smoke 渲染；后端 PATCH 已覆盖。

风险：TipTap 与 React Router SSR；编辑器只在客户端 hydrate。
<!-- SECTION:PLAN:END -->
