---
id: WCH-36
title: 汽车、游戏、影视主题与示范信源
status: Done
assignee: []
created_date: '2026-10-21T03:12:00Z'
updated_date: '2026-10-22T10:28:00Z'
labels:
  - content
  - sources
milestone: m-5
dependencies:
  - WCH-35
documentation:
  - docs/WeChatHot/brand-channels.md
priority: high
type: task
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
更新 industry/topics.json 和 industry/sources.json：补充汽车、游戏、电影与剧集的公司/方向/内容形态主题和示范信源；信源优先使用官网、官方博客、GitHub、RSS 和公开媒体。使用者尚未确认的品牌与信源标注为候选，不假装已启用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 topics.json 中三个新领域的主题可被 /topics 和品牌页引用
- [x] #2 sources.json 为每个新领域提供至少一个可验证的官方或媒体示例
- [x] #3 候选信源与已确认信源有清楚区分
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 为三个新领域补公司/方向/内容形态主题。2. 补可验证的官方与媒体信源。3. 未确认信源标候选并默认停用。4. 测试覆盖主题与信源可用性。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
验证：topics.json 194 个主题（含 96 个新公司主题）；6 个新信源实测 RSS 可读；候选 2 个且 enabled:false；taxonomy 测试 5/5；npm test 661/661。
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-10-21T03:48:00Z

---

品牌渠道候选与修正见 docs/WeChatHot/brand-channels.md；汽车/游戏/影视的新增品牌和信源可从这里取种子。

---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
汽车/游戏/影视的主题与示范信源完成：96 个公司主题 + 12 个方向/形态主题；官方与媒体信源已实测；候选信源停用并标记。
<!-- SECTION:FINAL_SUMMARY:END -->
