---
id: WCH-3
title: Studio 外壳、登录与根路径重定向
status: To Do
assignee: []
created_date: '2026-10-21T03:10:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - frontend
  - auth
milestone: m-0
dependencies:
  - WCH-1
priority: high
type: feature
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 /studio 的私有壳层：桌面侧栏、移动底栏、顶部栏、登录校验、退出登录、页面标题和空状态。所有响应 no-store，页面 noindex/nofollow；/ 重定向到 /studio，未登录时先登录再回到工作台。导航先放五个一级入口的空页面。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 / 访问进入 /studio；未登录完成登录后回到 /studio
- [ ] #2 桌面与 375px 视口下导航可用；Studio 响应带 no-store 和 noindex
- [ ] #3 普通访客不能读取任何 Studio 页面或接口
<!-- AC:END -->
