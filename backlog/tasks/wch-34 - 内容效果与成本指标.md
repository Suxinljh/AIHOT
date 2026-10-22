---
id: WCH-34
title: 内容效果与成本指标
status: Done
assignee: []
created_date: '2026-10-21T03:12:00Z'
updated_date: '2026-10-22T05:03:00Z'
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
- [x] #1 能按时间范围查看选题采纳率和草稿完成率
- [x] #2 能查看单篇/批量模型成本和采集量
- [x] #3 指标口径在页面内有说明，空数据不显示误导性 0
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
验证：metrics 模块测试覆盖比率/成本/空区间；metrics 页面测试覆盖数字与空状态；typecheck、web 测试 25/25、npm test 648/648。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
指标页完成：选题采纳、草稿完成、人工改写、单篇与每百条采集成本，口径写在页内，空区间不显示误导性 0。
<!-- SECTION:FINAL_SUMMARY:END -->
