---
id: WCH-46
title: 修复公众号字体被清理
status: Done
assignee: []
created_date: '2026-10-23T04:24:00Z'
updated_date: '2026-10-23T04:26:00Z'
labels:
  - backend
  - frontend
milestone: m-3
dependencies: []
priority: high
type: bug
ordinal: 53000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
排版和模板已经保存 fontFamily，但 sanitize-html 的 allowedStyles 没有放行 font-family，最终复制的 HTML 里字体被清理掉。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 渲染后的公众号 HTML 保留 font-family
- [x] #2 标题、正文、列表、引用都使用设置字体
- [x] #3 补回归测试，typecheck 与测试通过
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 在 sanitize-html 的 allowedStyles 放行 font-family。
2. 补字体保留的序列化/清理测试。
3. 重启 api 并验证稿件输出。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
根因：sanitizeWechatHtml 的 allowedStyles 没有 font-family，排版和模板虽然保存了字体，复制前被清理。放行后实测稿件 #6 输出包含 font-family:Optima-Regular, PingFangTC-light；标题、正文、列表、引用都写入。npm test 677/677。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
修复字体被 sanitize 清理的问题，渲染后的公众号 HTML 保留 font-family。
<!-- SECTION:FINAL_SUMMARY:END -->
