---
id: WCH-28
title: GitHub API 信源类型（Tags/Commits/Issues/PR）
status: In Progress
assignee: []
created_date: '2026-10-21T03:12:00Z'
updated_date: '2026-10-22T05:34:00Z'
labels:
  - backend
  - source
milestone: m-4
dependencies:
  - WCH-13
  - WCH-14
priority: medium
type: feature
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在框架中新增 github 信源类型，支持仓库 Tags、默认分支 Commits、Issues 和 Pull Requests；补齐数据库 CHECK、sources/types.ts、config-keys.ts、collect.ts、后台标签和文档。默认只启用 Releases，Commits/Issues/PR 默认关闭通知；支持条件请求、速率限制、退避和可选 GITHUB_TOKEN。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 github 信源可通过后台创建并采集 Tags/Commits/Issues/PR
- [ ] #2 默认关闭高频通知，限流和失败可诊断、可重试
- [ ] #3 迁移、类型、配置、文档和测试同步更新
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 新增 kind=github 与迁移（放宽 CHECK）。2. sources/github.ts：tags/commits/issues/pulls、ETag、限流错误。3. collect/调度/热度 SQL、后台表单与判重、文档。4. 单测覆盖四种 feed、304、限流和非法 repo。
<!-- SECTION:PLAN:END -->
