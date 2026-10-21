---
id: WCH-35
title: 7 类行业 taxonomy 与主体词典
status: To Do
assignee: []
created_date: '2026-10-21T03:12:00Z'
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
- [ ] #1 taxonomy 只暴露 7 个公开类别，key 与 PRD 2.3 一致
- [ ] #2 实体、别名和身份词典能覆盖首批汽车、游戏、影视品牌
- [ ] #3 仓库内不再有把 industry 当作公开分类的残留引用
<!-- AC:END -->
