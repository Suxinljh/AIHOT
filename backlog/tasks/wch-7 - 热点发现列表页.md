---
id: WCH-7
title: 热点发现列表页
status: To Do
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - frontend
milestone: m-1
dependencies:
  - WCH-6
priority: high
type: feature
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 /studio 热点列表：行业 Tabs、品牌/渠道/类型/来源等级/时间筛选、排序、事件卡片、关注更新入口和全部事件开关。筛选状态写入 URL，支持桌面与 375px；包含加载、空和错误状态。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 列表筛选和排序通过 URL 可复现，刷新后状态不丢
- [ ] #2 事件卡片展示 PRD 要求的标题、摘要、品牌、行业、时间、来源、三套分数和状态
- [ ] #3 375px 无横向溢出，加载/空/错误状态完整
<!-- AC:END -->
