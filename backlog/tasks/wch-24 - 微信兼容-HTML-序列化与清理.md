---
id: WCH-24
title: 微信兼容 HTML 序列化与清理
status: To Do
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - backend
  - frontend
milestone: m-3
dependencies:
  - WCH-21
priority: high
type: feature
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 TipTap 文档 JSON 到微信公众号兼容 HTML 的序列化：只输出 section/p/h2/h3/strong/img 等基础标签，字体、字号、行高、段距、颜色、对齐写成 inline style；不使用 class、flex、grid、外部字体和脚本。导出前用 sanitize-html 清理并补图片 max-width。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 序列化输出符合白名单标签和 inline style 规则
- [ ] #2 清理步骤能移除脚本、事件属性和不允许的样式
- [ ] #3 空文档、嵌套列表和图片等边界输入不产生非法 HTML
<!-- AC:END -->
