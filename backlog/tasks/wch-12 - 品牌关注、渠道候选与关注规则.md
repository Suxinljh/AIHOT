---
id: WCH-12
title: 品牌关注、渠道候选与关注规则
status: To Do
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - backend
  - frontend
milestone: m-1
dependencies:
  - WCH-10
priority: high
type: feature
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现关注品牌后展示候选官网、X、微信公众号、微博、GitHub 等渠道，区分已验证官方、用户指定、待验证、暂不可用；支持勾选渠道、全部/重大/指定事件/关键词规则、取消关注、静音和屏蔽词。渠道与信源解耦，停用单渠道不影响品牌关注。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 关注品牌后可选择渠道并保存规则
- [ ] #2 停用/删除单渠道后品牌关注仍有效，相关事件仍可查看
- [ ] #3 规则、静音和屏蔽词可编辑并立即生效
<!-- AC:END -->
