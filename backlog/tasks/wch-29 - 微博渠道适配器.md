---
id: WCH-29
title: 微博渠道适配器
status: To Do
assignee: []
created_date: '2026-10-21T03:12:00Z'
updated_date: '2026-10-23T00:37:00Z'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 在 industry/sources.json 增加 27 条 rss 信源，地址为 ${RSSHUB_BASE}/weibo/user/<uid>，tier T2、tags [微博, 官方]，owner_entity_id 对应品牌。2. 叠纸无 UID，写成 enabled:false 的候选。3. 文档补 RSSHub 部署、限流与失效处理。4. 手动预览几条，确认能取到内容。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
方案已定：不新增微博适配器，用 RSSHub 的 /weibo/user/<uid> 作为 rss 信源。27 个品牌 UID 已收在 docs/WeChatHot/weibo-uids.md；叠纸无 UID，标候选。需要在 .env 配 RSSHUB_BASE，并决定这些源是否默认启用。
<!-- SECTION:NOTES:END -->
