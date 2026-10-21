---
id: WCH-15
title: 站内通知与关注更新
status: To Do
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - backend
  - frontend
milestone: m-1
dependencies:
  - WCH-4
  - WCH-12
priority: high
type: feature
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 /studio/alerts 与通知生成：新事件、关注品牌更新、采集错误；按品牌/渠道/事件类型规则匹配，同一事件多条更新合并为一条通知，记录触发和去重原因；支持单条/全部已读、静音和跳转事件。P0 只做站内通知。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 关注品牌达到规则后产生站内通知，可跳转到事件
- [ ] #2 同一事件多条来源更新只产生一条通知
- [ ] #3 采集失败通知可见，已读和静音状态持久化
<!-- AC:END -->
