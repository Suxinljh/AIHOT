---
id: WCH-18
title: 写作队列与角度、大纲生成
status: To Do
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - backend
  - ai
  - worker
milestone: m-2
dependencies:
  - WCH-17
  - WCH-22
priority: high
type: feature
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
建立 wechathot.write 队列和 angle/outline 步骤，使用 chatJson + zod schema、subject 回执和预算；输入事件证据包、栏目、用户备注和风格预设；输出候选角度与理由、章节大纲。支持快速写作一次串联，分步写作由用户逐步触发。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 可从选题生成多个角度并选择其一
- [ ] #2 选择角度后能生成可编辑大纲，支持重生成和手动改写
- [ ] #3 队列失败可重试，不重复扣费，不丢失已有步骤结果
<!-- AC:END -->
