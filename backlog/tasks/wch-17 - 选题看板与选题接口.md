---
id: WCH-17
title: 选题看板与选题接口
status: To Do
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - backend
  - frontend
milestone: m-2
dependencies:
  - WCH-2
  - WCH-9
priority: high
type: feature
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 wc_topics 的创建、查询、编辑和状态流转：待评估、待研究、待写作、写作中、已完成、已忽略、归档；保存事件 ID、角度、栏目、备注和创建时来源快照；同一事件再次创建时提示已有选题。提供 /studio/topics 看板与详情页，支持从事件详情创建选题。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 事件详情可创建选题，看板按状态展示并可流转
- [ ] #2 选题保留来源快照，刷新事件不会静默改写已有选题
- [ ] #3 同一事件重复创建有提示，不会无意识生成重复任务
<!-- AC:END -->
