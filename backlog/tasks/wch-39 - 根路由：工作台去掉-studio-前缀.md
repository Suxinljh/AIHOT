---
id: WCH-39
title: 根路由：工作台去掉 /studio 前缀
status: Done
assignee: []
created_date: '2026-10-23T00:37:00Z'
updated_date: '2026-10-23T00:52:00Z'
labels:
  - frontend
  - refactor
milestone: m-3
dependencies: []
priority: high
type: feature
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
把工作台所有页面迁到根路径，/studio 只保留兼容跳转。范围：/（热点发现）、/events/:publicId、/alerts、/topics、/topics/:id、/articles、/articles/:id、/sources、/sources/new、/sources/:id、/brands、/brands/:id、/calendar、/metrics、/settings。后端 /api/* 与后台 /admin 不变。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 所有工作台页面在根路径可访问，/ 显示热点发现，不再 302 到 /studio
- [x] #2 旧 /studio/* 302 到对应新地址，未登录仍跳登录并在登录后回到原路径
- [x] #3 导航、页面内链接、测试、smoke 脚本与文档全部使用新路径
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. ModulePage 支持 index；routes.ts 用 index(file) 渲染模块首页。2. module.ts 的布局页改为根路径，/ 为热点发现；删除 home.tsx 的跳转。3. 全部 /studio/... 链接、导航与登录回跳改为新路径。4. 旧 /studio/* 用 302 兼容。5. 更新 web 测试、smoke 与文档；跑 typecheck/test/smoke。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
验证：web 测试 25/25；typecheck；npm test 666/666；smoke 全过（/ 与 /topics 跳登录、/studio/topics 302 到 /topics）。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
根路由完成：/ 为热点发现，工作台页面全部迁到根路径；/studio/* 仅 302 兼容；导航、登录回跳、测试、smoke、文档同步。
<!-- SECTION:FINAL_SUMMARY:END -->
