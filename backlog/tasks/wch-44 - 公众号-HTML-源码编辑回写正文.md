---
id: WCH-44
title: 公众号 HTML 源码编辑回写正文
status: Done
assignee: []
created_date: '2026-10-23T03:41:00Z'
updated_date: '2026-10-23T03:44:00Z'
labels:
  - frontend
  - backend
milestone: m-3
dependencies: []
priority: high
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
公众号视图目前只能查看 HTML。增加可编辑的 HTML 源码模式，应用后把支持的结构解析回 TipTap 正文；不安全链接和脚本丢弃，空内容拒绝。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 公众号视图可以编辑 HTML 并应用到正文
- [x] #2 支持标题、段落、列表、引用、代码、图片和行内标记
- [x] #3 脚本和 javascript 链接被丢弃，空内容返回 400
- [x] #4 解析与应用有回归测试，typecheck 和测试通过
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 用 cheerio 解析公众号 HTML，映射为 TipTap 文档。
2. 新增 POST /api/studio/articles/:id/html，解析后更新正文并生成新版本。
3. 公众号视图增加 HTML 编辑区、应用和取消。
4. 补解析/接口测试并跑全套检查。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
新增 html-import.ts：标题、段落、列表、引用、代码块、图片、hr、加粗/斜体/删除线/行内代码/链接；脚本和 javascript: 链接丢弃，空内容 400。公众号视图增加编辑 HTML、应用正文、取消。解析测试 3/3，文章接口测试 6/6，npm test 676/676。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
公众号 HTML 可手工编辑并回写正文；只保留编辑器支持的结构，危险内容和样式丢弃。
<!-- SECTION:FINAL_SUMMARY:END -->
