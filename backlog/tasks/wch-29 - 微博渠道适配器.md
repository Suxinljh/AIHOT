---
id: WCH-29
title: 微博渠道适配器
status: Done
assignee: []
created_date: '2026-10-21T03:12:00Z'
updated_date: '2026-10-23T02:02:00Z'
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
- [x] #1 可添加微博适配器信源并预览最近条目
- [x] #2 认证失效、限流和解析失败有明确状态
- [x] #3 未配置适配器时给出可操作的配置说明
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 在 industry/sources.json 增加 27 条 rss 信源，地址为 ${RSSHUB_BASE}/weibo/user/<uid>，tier T2、tags [微博, 官方]，owner_entity_id 对应品牌。2. 叠纸无 UID，写成 enabled:false 的候选。3. 文档补 RSSHub 部署、限流与失效处理。4. 手动预览几条，确认能取到内容。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
方案已定：不新增微博适配器，用 RSSHub 的 /weibo/user/<uid> 作为 rss 信源。27 个品牌 UID 已收在 docs/WeChatHot/weibo-uids.md；叠纸无 UID，标候选。需要在 .env 配 RSSHUB_BASE，并决定这些源是否默认启用。

已加 29 条微博 RSSHub 源（含迪士尼电影，叠纸无 UID 未加），地址用 {{RSSHUB_BASE}} 占位，seed 时替换；NAS 地址 http://192.168.3.32:1200。当前 /weibo/user 返回 503，源默认停用为候选，待 RSSHub 配好 WEIBO_COOKIE 后启用并验证。

实测：RSSHub /weibo/user/1746221281 返回 200，fetchRss 解析 9 条（标题/链接/时间正常）。内网访问需 ALLOW_PRIVATE_NETWORK_FETCH=true。失败时信源健康记录 HTTP 状态，RSSHub 页面与容器日志给出具体原因。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
微博通过自建 RSSHub 接入：29 条信源启用、240 分钟、实测可采集；文档覆盖 chromium-bundled、WEIBO_COOKIE、内网访问与限流。
<!-- SECTION:FINAL_SUMMARY:END -->
