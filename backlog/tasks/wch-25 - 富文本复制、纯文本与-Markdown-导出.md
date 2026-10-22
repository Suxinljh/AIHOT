---
id: WCH-25
title: 富文本复制、纯文本与 Markdown 导出
status: Done
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-22T04:23:00Z'
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
- [x] #1 复制按钮在支持的浏览器中写入 text/html，失败时回退成功
- [x] #2 纯文本和 Markdown 与正文内容一致，保留标题层级和来源链接
- [x] #3 来源列表开关生效，不改变编辑器中的正文
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
验证：export 单测 3/3；浏览器打开「公众号」tab，375px 预览、复制按钮与来源开关渲染正常；typecheck、web 测试 21/21、npm test 640/640。富文本复制走 ClipboardItem，失败回退 execCommand。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
富文本/纯文本/Markdown 导出完成：页面按钮、来源开关、下载 .md；导出只读正文，不修改文档。
<!-- SECTION:FINAL_SUMMARY:END -->
