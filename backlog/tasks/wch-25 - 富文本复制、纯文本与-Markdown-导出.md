---
id: WCH-25
title: 富文本复制、纯文本与 Markdown 导出
status: To Do
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - frontend
milestone: m-3
dependencies:
  - WCH-23
  - WCH-24
priority: high
type: feature
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现复制带样式富文本到剪贴板，失败时回退到隐藏 contentEditable + execCommand；同时提供纯文本和 Markdown 导出。导出前显示来源列表开关，默认保留可追溯出处，用户可取消。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 复制按钮在支持的浏览器中写入 text/html，失败时回退成功
- [ ] #2 纯文本和 Markdown 与正文内容一致，保留标题层级和来源链接
- [ ] #3 来源列表开关生效，不改变编辑器中的正文
<!-- AC:END -->
