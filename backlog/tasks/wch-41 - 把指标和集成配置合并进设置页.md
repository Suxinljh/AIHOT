---
id: WCH-41
title: 把指标和集成配置合并进设置页
status: Done
assignee: []
created_date: '2026-10-23T02:19:00Z'
updated_date: '2026-10-23T02:20:00Z'
labels:
  - frontend
milestone: m-3
dependencies: []
priority: medium
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
管理员希望只在一个设置页完成所有配置和查看内容成本。把 /metrics 与 /settings/integrations 的内容作为分区放进 /settings，用分隔线区分；旧的两个页面地址不再保留。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 设置页同时显示集成配置与内容成本分区
- [x] #2 /metrics 与 /settings/integrations 不再作为独立页面
- [x] #3 web 测试覆盖设置页的指标、空区间和集成配置
- [x] #4 typecheck、npm test、web 构建与 smoke 均通过
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 把 metrics 与 integrations 页面改成可复用的 section 组件。
2. 设置页 loader 并行读取 presets、通知、集成配置和指标，并渲染两个新分区。
3. 删除 metrics 与 settings/integrations 路由，更新文档与测试。
4. 跑 typecheck、web 构建与测试、npm test、smoke，浏览器核对设置页。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
验证：/settings 200，含「集成配置」「内容与成本」；/metrics 与 /settings/integrations 均 404。web 测试 25/25，npm test 669/669，typecheck、web build、smoke 通过。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
指标与集成配置合并到 /settings 的两个分区，删除独立页面路由；测试与文档同步更新。
<!-- SECTION:FINAL_SUMMARY:END -->
