---
id: WCH-43
title: 写作与排版模板可编辑
status: Done
assignee: []
created_date: '2026-10-23T03:41:00Z'
updated_date: '2026-10-23T03:44:00Z'
labels:
  - frontend
  - backend
milestone: m-3
dependencies: []
priority: high
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
设置页目前只展示内置预设，排版预设的后端也不允许编辑；文章排版 PATCH 还会被忽略。让管理员直接编辑内置写作/排版模板，新建和删除自定义模板，并让排版修改真正落库。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 设置页可以编辑写作风格和排版预设
- [x] #2 可以新建自定义模板，删除只对自定义模板开放
- [x] #3 文章排版修改通过 PATCH 持久化，刷新后保留
- [x] #4 typecheck、模块测试和 web 测试通过
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 修复文章 PATCH 忽略 format 的问题，排版修改真正落库。
2. 预设后端支持 kind=format 的创建/更新/删除，内置可改不可删。
3. 设置页增加写作/排版模板编辑对话框、新建和删除。
4. 补测试并跑全套检查。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
预设接口现在支持 kind=format；updateStylePreset 不再拒绝排版预设，内置可改、自定义可删。文章 PATCH 增加 format 并写入 wc_articles.format，刷新后保留。设置页新增编辑对话框、新建写作/排版模板和删除自定义模板。预设测试 5/5，文章测试 6/6，web 测试 25/25，npm test 676/676。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
设置页可直接编辑内置写作/排版模板，新建和删除自定义模板；文章排版修改已持久化。
<!-- SECTION:FINAL_SUMMARY:END -->
