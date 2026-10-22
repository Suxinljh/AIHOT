---
id: WCH-39
title: 清理公开读取层残留
status: To Do
assignee: []
created_date: '2026-10-22T02:04:00Z'
labels:
  - cleanup
  - backend
milestone: m-4
dependencies: []
priority: high
type: task
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
WCH-33 下线公开出口后，packages/backend/src/publication/ 里仍有只服务于旧网页/RSS/API/MCP 的读取模块（agent、feeds、llms、sitemap、v1、pool、availability、timeline、followups、groups、reports、story-text 等），以及 site/ 里只被它们使用的页面文案、public 文件与站点配置。现在没有路由引用，属于死代码。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 publication/ 只保留出刊、工作台和引擎仍在使用的模块，删除的每个文件都有引用检查依据
- [ ] #2 site/pages、site/public 与只服务公开页的 site 配置按引用清理，类型检查通过
- [ ] #3 删除后 npm run typecheck、npm test、web 测试和 smoke 全绿
- [ ] #4 docs/ 不再描述已删除的模块与配置
<!-- AC:END -->
