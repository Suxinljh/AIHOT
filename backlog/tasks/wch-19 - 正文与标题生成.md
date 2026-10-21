---
id: WCH-19
title: 正文与标题生成
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
  - WCH-18
priority: high
type: feature
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 body/title 写作步骤：按大纲分节生成正文，支持整篇和按章节生成；生成直述型、问题型、观点型标题候选。正文必须带证据引用，区分官方、媒体、未证实和作者判断；结果写回 wc_articles 并建立版本。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 能从已确认大纲生成资讯/洞察正文和多个标题候选
- [ ] #2 正文中的事实、数字、日期和来源可追溯到证据包
- [ ] #3 支持按章节重生成、扩写、精简和调整语气，且不覆盖其他章节
<!-- AC:END -->
