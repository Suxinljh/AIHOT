---
id: WCH-11
title: 品牌库与品牌详情页
status: Done
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T07:19:00Z'
labels:
  - frontend
milestone: m-1
dependencies:
  - WCH-10
priority: high
type: feature
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 /studio/brands 和 /studio/brands/:id：品牌列表、搜索、行业筛选、新建/编辑/合并入口；详情页参考现有 /topics 的品牌标记、关联事件和时间线结构，展示候选渠道与关注状态。操作属于 Studio 私有页面。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 品牌可搜索、筛选、新建、编辑和合并
- [x] #2 品牌详情展示关联事件、渠道和关注状态，视觉结构与 /topics 一致
- [x] #3 空品牌、无渠道、无事件时有明确空状态
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 注册 /studio/brands 与 /studio/brands/:id，并在顶栏把品牌页归入「关注与信源」；不新增第六个一级底栏入口，改由 /studio/sources 提供品牌库入口。 2. 新增 Studio 专用 action hook 与 toast 容器，复用管理员会话的 CSRF token，写操作后 revalidate。 3. 新增品牌页面共享组件：品牌标记、行业/验证/渠道/关注标签、创建编辑弹窗、合并弹窗、空状态。 4. 品牌库列表：q 搜索、行业筛选、关注状态筛选、品牌卡片、新建与合并入口。 5. 品牌详情：品牌头部、别名/行业/官网/实体/备注、关注状态、候选渠道、相关事件时间线，以及编辑和合并入口。 6. 运行 typecheck、Web build、模块测试，并在桌面和 375px 浏览器检查列表、详情、弹窗和空状态。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现记录：
- 品牌库归入「关注与信源」，保留五个一级入口；/studio/sources 提供「打开品牌库」。
- 列表的 all 查询只用于统计和合并候选，筛选只改变当前卡片；新建/编辑/合并共用 Studio action 与 CSRF。
- 详情页把合并目标限制为其他品牌，迁移后跳到存活品牌；删除仍只保留在 API，界面不提供破坏性删除。
- 手机端 toast 放在底栏上方，避免遮挡操作。
验证：typecheck、@aihot/web build、wechathot 17/17 测试；Playwright 1440px/375px 覆盖搜索、行业/关注筛选、新建、编辑、合并、详情、无匹配/无渠道/无事件/未关注状态，无横向溢出、无控制台错误。临时品牌已清理。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成 /studio/brands 与 /studio/brands/:id：品牌库支持搜索、行业/关注筛选、新建、编辑、合并；详情页展示品牌标记、别名/行业/官网/备注、关注状态、候选渠道和相关事件时间线，并复用 /topics 的视觉结构。品牌库归入「关注与信源」，未新增第六个一级导航；/studio/sources 增加入口。空品牌库、无匹配、无渠道、无事件、未关注均有明确空状态。

验证：npm run typecheck；npm run build -w @aihot/web；wechathot 模块测试 17/17；Playwright 在 1440px 和 375px 覆盖筛选、创建、编辑、合并、详情和空状态，未发现横向溢出或控制台错误。临时品牌已清理。

关注规则编辑和通知设置留给后续任务；详情页事件标题暂不链接到事件页，等 WCH-9。
<!-- SECTION:FINAL_SUMMARY:END -->
