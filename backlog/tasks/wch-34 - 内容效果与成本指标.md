---
id: WCH-34
title: 内容效果与成本指标
status: To Do
assignee: []
created_date: '2026-10-21T03:12:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - backend
  - frontend
milestone: m-4
dependencies:
  - WCH-17
  - WCH-21
priority: low
type: feature
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
增加工作台指标页：选题采纳率、草稿完成率、人工改写率、单篇模型成本和每百条采集信息的调用开销；数据来自 wc_topics、wc_articles、回执和采集记录，不新增外部统计服务。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 能按时间范围查看选题采纳率和草稿完成率
- [ ] #2 能查看单篇/批量模型成本和采集量
- [ ] #3 指标口径在页面内有说明，空数据不显示误导性 0
<!-- AC:END -->
