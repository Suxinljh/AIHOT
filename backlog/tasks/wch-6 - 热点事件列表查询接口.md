---
id: WCH-6
title: 热点事件列表查询接口
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
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在模块 server.ts 的 api 插口实现 /api/studio/events：支持 7 类行业、品牌、渠道、事件类型、来源等级、时间范围、已读、已选题筛选；支持最新发现、最新进展、热度、选题推荐分、关注优先排序；返回分页结果和筛选元数据。默认只返回有编辑价值的事件，可切换全部已采集事件。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 各筛选与排序组合返回正确结果，分页稳定且不重复
- [ ] #2 默认过滤和全部事件切换符合 PRD 4.1.1
- [ ] #3 接口只允许管理员会话，响应 no-store
<!-- AC:END -->
