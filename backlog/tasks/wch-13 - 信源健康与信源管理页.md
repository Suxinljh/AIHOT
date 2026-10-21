---
id: WCH-13
title: 信源健康与信源管理页
status: To Do
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - backend
  - frontend
milestone: m-1
dependencies:
  - WCH-1
  - WCH-2
priority: high
type: feature
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
复用 admin/sources 能力实现 /studio/sources：列出官网、RSS、X、公众号、媒体等信源的健康状态、最近成功/失败、失败次数和错误；支持试抓、立即抓取、重试、启停和频率调整。状态从现有 health/last_error/fail_count 派生，不另造采集状态。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 能查看每个信源的状态、错误和最近抓取时间
- [ ] #2 试抓、立即抓取、重试和启停可用，失败不影响其他信源
- [ ] #3 公众号和 X 的付费/限流状态如实显示
<!-- AC:END -->
