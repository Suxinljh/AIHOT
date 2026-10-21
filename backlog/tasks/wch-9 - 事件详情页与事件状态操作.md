---
id: WCH-9
title: 事件详情页与事件状态操作
status: To Do
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - frontend
milestone: m-1
dependencies:
  - WCH-8
priority: high
type: feature
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 /studio/events/:publicId：展示摘要、时间线、原始报道、事实、评分解释和品牌；支持已读、收藏、忽略、关注后续等操作，并在列表页同步。暂不包含创建选题，入口在 P0-B 接入。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 详情页信息完整，时间线与原始报道可展开
- [ ] #2 状态操作立即生效，返回列表后保持一致
- [ ] #3 375px 下阅读和操作可用
<!-- AC:END -->
