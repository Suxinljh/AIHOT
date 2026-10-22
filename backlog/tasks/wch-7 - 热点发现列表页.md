---
id: WCH-7
title: 热点发现列表页
status: Done
assignee:
  - '@agent'
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T07:52:00Z'
labels:
  - frontend
milestone: m-1
dependencies:
  - WCH-6
priority: high
type: feature
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 /studio 热点列表：行业 Tabs、品牌/渠道/类型/来源等级/时间筛选、排序、事件卡片、关注更新入口和全部事件开关。筛选状态写入 URL，支持桌面与 375px；包含加载、空和错误状态。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 列表筛选和排序通过 URL 可复现，刷新后状态不丢
- [x] #2 事件卡片展示 PRD 要求的标题、摘要、品牌、行业、时间、来源、三套分数和状态
- [x] #3 375px 无横向溢出，加载/空/错误状态完整
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 把 /studio 从占位页改成真实热点列表：loader 读取 URL 查询参数并调用 /api/studio/events，筛选、排序、范围和分页全部由 URL 决定。
2. 行业 Tabs 用 facets 计数，品牌/渠道/事件类型/来源等级/时间范围/已读/已选题用筛选控件，排序和「全部事件」开关同样写回 URL。
3. 事件卡片展示 PRD 要求的标题、摘要、品牌、行业、事件类型、时间、主要来源、条目数、三套分数、核实状态和选题状态，并链到事件详情页。
4. 补加载、空（无事件 / 无匹配）、错误状态和分页，桌面与 375px 都不横向溢出。
5. 补页面测试（合成 api）并用 Playwright 在 1440px 和 375px 检查真实数据页面。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现记录：
- /studio 由占位页换成真实热点列表：loader 读 URL 查询参数调用 /api/studio/events；页面参数 days 换算成接口的绝对时间 from，其余参数原样传递。
- 筛选全部写回 URL：行业 Tabs、品牌/渠道/事件类型/来源等级下拉、时间范围（24 小时/7 天/30 天）、已读与已选题 chips、排序下拉、「有编辑价值 / 全部事件」开关和分页；刷新或复制链接都能复现同一份列表。
- 事件卡片展示行业、事件类型、核实状态与已更新、已读/收藏/忽略/关注后续/人工判断/选题数、标题（链到事件详情页）、摘要、品牌标签、首发与最近更新时间、报道数与来源数、主要来源和三套分数。
- 状态：没有事件、没有匹配、上游出错三种各有自己的呈现；加载时列表变淡并显示「正在加载…」。
- 验证：typecheck、@aihot/web build、apps/web/tests/studio-hot-list.test.ts（合成 api 断言 URL 透传、卡片内容、空与错误状态）；Playwright 在 1440px 与 375px 用真实数据检查：行业、范围、排序、品牌、时间范围、已读都写进 URL 并改变结果，切换排序会改变首条事件，无横向溢出、无控制台错误。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成 /studio 热点列表：行业 Tabs（带计数）、品牌/渠道/事件类型/来源等级/时间范围/已读/已选题筛选、五种排序、「有编辑价值 / 全部事件」开关和分页，全部状态写在 URL 里，刷新或分享链接都能复现同一份列表。

事件卡片按 PRD 展示行业、事件类型、核实状态与已更新、选题与已读收藏忽略等状态、标题与摘要、品牌标签、首发与最近更新时间、报道数与来源数、主要来源，以及新闻价值、热度、选题推荐分三套分数；标题链到事件详情页。顶部提供「关注更新」入口指向已关注品牌。

补齐了没有事件、没有匹配、上游出错三种状态和加载提示，桌面与 375px 都不横向溢出。

验证：npm run typecheck；npm run build -w @aihot/web；新增 apps/web/tests/studio-hot-list.test.ts 覆盖 URL 透传、卡片字段、空与错误状态；Playwright 在 1440px 和 375px 用真实数据逐个操作筛选、排序和范围并确认 URL 与结果同步，无控制台错误。
<!-- SECTION:FINAL_SUMMARY:END -->
