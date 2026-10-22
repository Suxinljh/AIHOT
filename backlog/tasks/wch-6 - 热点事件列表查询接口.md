---
id: WCH-6
title: 热点事件列表查询接口
status: Done
assignee:
  - '@agent'
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T07:33:00Z'
labels:
  - backend
  - api
milestone: m-1
dependencies:
  - WCH-2
  - WCH-4
priority: high
type: feature
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在模块 server.ts 的 api 插口实现 /api/studio/events：支持 7 类行业、品牌、渠道、事件类型、来源等级、时间范围、已读、已选题筛选；支持最新发现、最新进展、热度、选题推荐分、关注优先排序；返回分页结果和筛选元数据。默认只返回有编辑价值的事件，可切换全部已采集事件。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 各筛选与排序组合返回正确结果，分页稳定且不重复
- [x] #2 默认过滤和全部事件切换符合 PRD 4.1.1
- [x] #3 接口只允许管理员会话，响应 no-store
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 扩展 wc_event_meta 读模型：补充摘要、主要来源、新闻价值、精选报道数与证据来源数，并在事件投影中写入；补一条 first_report_at 排序索引。
2. 新增模块 event-list 查询层：实现行业/品牌/渠道/事件类型/来源等级/时间/已读/已选题筛选，curated 与 all 两种范围，五种排序和稳定分页。
3. 在 server.ts 注册 GET /api/studio/events，沿用管理员会话、CSRF 与 no-store；返回事件卡片字段、分页与筛选元数据。
4. 补投影字段与列表接口测试，覆盖筛选、排序、分页去重、默认范围和鉴权。
5. 更新 PRD 数据字段说明，运行 typecheck、模块测试与 web 构建。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现记录：
- wc_event_meta 新增 summary、primary_source、news_value、selected_count、evidence_source_count（0144–0149），投影写入代表报道摘要/来源、新闻价值、精选报道数和独立证据来源数，并补 first_report_at 排序索引。
- GET /api/studio/events 支持 scope=curated|all（默认 curated：selected_count > 0 或 evidence_source_count >= 2）、industry/brand/channel/eventType/sourceTier 多值、from/to、read、topic、page/pageSize 与五种排序；返回卡片字段、私有状态、分页和分面元数据。分面统计排除自身维度，选中一个行业后其他行业仍有计数。
- 「关注优先」当前按品牌关注判定；渠道、信源和关键词关注规则留到 WCH-12 接入。
- 验证：typecheck、@aihot/web build、wechathot 25/25 测试通过。完整 npm test 为 756 通过 / 11 失败，失败均在本任务未触及的既有用例（架构检查里的后续任务未用列、备份所需的系统工具、已下线的公开页面元数据）。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成 /api/studio/events：默认只返回有编辑价值的事件（至少一篇精选报道或至少两个独立证据来源），scope=all 可切到全部已采集事件；支持行业、品牌、渠道、事件类型、来源等级、时间范围、已读、已选题筛选，以及最新发现、最新进展、热度、选题推荐分、关注优先五种排序。分页使用 story_id 作为稳定次序，返回事件卡片字段、私有状态、分页和分面统计。

wc_event_meta 读模型补了摘要、主要来源、新闻价值、精选报道数和独立证据来源数，投影任务写入对应值；接口沿用管理员会话和 no-store。

验证：npm run typecheck；npm run build -w @aihot/web；wechathot 25/25 测试通过，覆盖筛选组合、五种排序、分页去重、默认/全部范围、分面和非法参数。完整 npm test 的 11 个失败与本次改动无关（架构检查的后续任务未用列、备份系统工具、已下线的公开页面元数据）。
<!-- SECTION:FINAL_SUMMARY:END -->
