---
id: WCH-8
title: 事件详情接口
status: To Do
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - backend
  - api
milestone: m-1
dependencies:
  - WCH-2
  - WCH-4
priority: high
type: feature
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 /api/studio/events/:publicId：返回事件综述、时间线、原始报道、事实证据、品牌、分类、核实状态、热度、新闻价值、选题推荐分及解释；同时返回已读、收藏、忽略等私有状态。只读复用 publication 的事件读取能力，不把 wc_ 数据写进公开层。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 能按 publicId 读取完整事件详情，字段与列表页一致
- [ ] #2 合并事件后仍能打开，并保留来源与状态
- [ ] #3 不存在的 id 返回 404；非管理员返回未授权
<!-- AC:END -->
