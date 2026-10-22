---
id: WCH-29
title: 微博渠道适配器
status: To Do
assignee: []
created_date: '2026-10-21T03:12:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - backend
  - source
milestone: m-4
dependencies:
  - WCH-13
priority: medium
type: feature
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现微博采集适配器或 RSSHub/JSON 配置向导：支持认证账号主页、关键词和指定博主；在信源页标记“通过适配器接入”，显示可用性和失败原因。P1 不假设微博有稳定免费原生接口。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 可添加微博适配器信源并预览最近条目
- [ ] #2 认证失效、限流和解析失败有明确状态
- [ ] #3 未配置适配器时给出可操作的配置说明
<!-- AC:END -->
