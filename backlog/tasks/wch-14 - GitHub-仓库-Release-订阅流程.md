---
id: WCH-14
title: GitHub 仓库 Release 订阅流程
status: To Do
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - backend
  - frontend
milestone: m-1
dependencies:
  - WCH-13
priority: high
type: feature
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 /studio/sources/new 的 GitHub 分支：粘贴仓库 URL，调用 GitHub API 验证公开可访问，判断 owner 是否为品牌官方组织，创建 releases.atom RSS 信源并试抓预览。P0 不新增 github 信源类型；可选 GITHUB_TOKEN 提高限额。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 公开仓库可创建 Release 订阅并预览版本号、说明和链接
- [ ] #2 私有/不存在仓库给出明确错误，不保存半成品信源
- [ ] #3 官方组织与第三方仓库的关联状态可区分
<!-- AC:END -->
