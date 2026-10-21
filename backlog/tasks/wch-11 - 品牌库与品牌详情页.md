---
id: WCH-11
title: 品牌库与品牌详情页
status: To Do
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - frontend
milestone: m-1
dependencies:
  - WCH-10
priority: high
type: feature
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 /studio/brands 和 /studio/brands/:id：品牌列表、搜索、行业筛选、新建/编辑/合并入口；详情页参考现有 /topics 的品牌标记、关联事件和时间线结构，展示候选渠道与关注状态。操作属于 Studio 私有页面。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 品牌可搜索、筛选、新建、编辑和合并
- [ ] #2 品牌详情展示关联事件、渠道和关注状态，视觉结构与 /topics 一致
- [ ] #3 空品牌、无渠道、无事件时有明确空状态
<!-- AC:END -->
