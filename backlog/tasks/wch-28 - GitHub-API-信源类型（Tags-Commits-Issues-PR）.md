---
id: WCH-28
title: GitHub API 信源类型（Tags/Commits/Issues/PR）
status: Done
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
- [x] #1 github 信源可通过后台创建并采集 Tags/Commits/Issues/PR
- [x] #2 默认关闭高频通知，限流和失败可诊断、可重试
- [x] #3 迁移、类型、配置、文档和测试同步更新
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 新增 kind=github 与迁移（放宽 CHECK）。2. sources/github.ts：tags/commits/issues/pulls、ETag、限流错误。3. collect/调度/热度 SQL、后台表单与判重、文档。4. 单测覆盖四种 feed、304、限流和非法 repo。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
验证：github-source 单测 7/7（四种 feed、PR 过滤、标签过滤、304、限额、非法 repo）；真实 API 拉取 openai/openai-python tags 成功（5 条 + ETag）；typecheck、web 测试 25/25、npm test 655/655、迁移检查通过。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
GitHub API 信源完成：四种 feed、ETag 条件请求、限额错误可诊断、标签过滤、后台创建与预览、迁移/文档/测试同步。默认 tags + 240 分钟。
<!-- SECTION:FINAL_SUMMARY:END -->
