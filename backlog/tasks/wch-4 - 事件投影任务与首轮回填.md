---
id: WCH-4
title: 事件投影任务与首轮回填
status: To Do
assignee: []
created_date: '2026-10-21T03:10:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - backend
  - worker
milestone: m-0
dependencies:
  - WCH-2
priority: high
type: feature
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 worker 定时投影：把 stories/facts/analyses 聚合进 wc_event_meta，写分类、品牌、渠道类型、来源等级、报道数、首发/最近时间、热度和核实状态。使用 entityIdentity() 映射品牌；合并事件时迁移选题、状态和关注引用。提供可重复执行的首轮回填命令。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 回填后工作台能读到与 AIHOT 事件一致的事件数量和主要字段
- [ ] #2 同一事件重复投影不产生重复行；合并事件后旧引用迁移到存活 story_id
- [ ] #3 单个事件投影失败不阻断其他事件和公开链路
<!-- AC:END -->
