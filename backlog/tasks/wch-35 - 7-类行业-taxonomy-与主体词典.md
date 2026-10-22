---
id: WCH-35
title: 7 类行业 taxonomy 与主体词典
status: Done
assignee: []
created_date: '2026-10-21T03:12:00Z'
updated_date: '2026-10-22T10:18:00Z'
labels:
  - content
  - taxonomy
milestone: m-5
dependencies: []
priority: high
type: feature
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
修改 industry/taxonomy.ts：固定为 ai-models、auto、hardware、software、embodied、film、game 七类；新增汽车与游戏，电影艺术改名电影与剧集，删除独立 industry 类别；同步标签词表、ENTITIES 和身份词典。融资、人事、政策、安全改为标签/事件类型，不再作为独立分类。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 taxonomy 只暴露 7 个公开类别，key 与 PRD 2.3 一致
- [x] #2 实体、别名和身份词典能覆盖首批汽车、游戏、影视品牌
- [x] #3 仓库内不再有把 industry 当作公开分类的残留引用
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 7 类 taxonomy（auto/game 新增，film 更名，移除 industry）。2. 品牌词库 102 条并入 ENTITIES（6 条合并）。3. 身份词典覆盖重点品牌。4. 清理旧类别名与标签映射，补 taxonomy 测试。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
验证：taxonomy 测试 4/4（7 类、102 品牌全覆盖、重点品牌词典、合并别名）；npm test 660/660；typecheck、web 测试 25/25。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
7 类行业 taxonomy 与首批 102 个汽车/游戏/影视品牌落地，身份词典覆盖重点品牌；旧 industry 类别与提示词残留已清理。
<!-- SECTION:FINAL_SUMMARY:END -->
