---
id: WCH-10
title: 品牌库接口
status: To Do
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - backend
  - api
milestone: m-1
dependencies:
  - WCH-2
  - WCH-5
priority: high
type: feature
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现品牌库 CRUD 与搜索：规范名、别名、行业、官网、Logo、实体映射、验证状态；支持合并重复品牌并把别名、渠道、事件关系迁移到存活品牌。列表支持按行业和关注状态筛选。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 品牌可新增、编辑、搜索和按行业筛选
- [ ] #2 合并品牌后别名、渠道和事件关系不丢失
- [ ] #3 名称重复和非法行业返回可读错误
<!-- AC:END -->
