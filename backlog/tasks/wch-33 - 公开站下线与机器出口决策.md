---
id: WCH-33
title: 公开站下线与机器出口决策
status: To Do
assignee: []
created_date: '2026-10-21T03:12:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - frontend
  - cleanup
milestone: m-4
dependencies:
  - WCH-3
priority: medium
type: task
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
按 PRD 3.1 分阶段下线公开阅读页：从导航移除、noindex、删除公开阅读路由和日报/周报/月报页面；评估 RSS、API v1、MCP 的实际使用情况，决定保留或下线。任何阶段都不得让 wc_ 私有数据进入公开出口。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 公开阅读页不再可访问或明确重定向到 /studio
- [ ] #2 RSS/API/MCP 的保留或下线有记录，且不输出 wc_ 数据
- [ ] #3 站点地图、分享图和搜索索引不再包含公开阅读页
<!-- AC:END -->
