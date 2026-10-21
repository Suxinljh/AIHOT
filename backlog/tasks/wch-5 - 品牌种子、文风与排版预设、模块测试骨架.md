---
id: WCH-5
title: 品牌种子、文风与排版预设、模块测试骨架
status: Done
assignee: []
created_date: '2026-10-21T03:10:00Z'
updated_date: '2026-10-21T06:33:00Z'
labels:
  - data
  - test
milestone: m-0
dependencies:
  - WCH-4
documentation:
  - docs/WeChatHot/brand-channels.md
priority: medium
type: chore
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
从 ENTITIES、PUBLISHER_DOMAINS 和行业数据生成首批 wc_brands 与候选渠道；写入内置写作风格预设和排版预设；建立模块测试骨架，覆盖迁移、投影和基础 API，测试不访问外部服务。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 首批品牌可从品牌库查询，含规范名、别名、行业和官网
- [x] #2 内置文风与排版预设可在设置页读取
- [x] #3 npm test 中模块测试通过，测试只连本地假服务
- [x] #4 首批渠道包含官网新闻页、X、GitHub 和公众号候选，未确认的保持 pending
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 新增 modules/wechathot/seed-data.ts：基于 ENTITIES/topics.json 维护首批 39 个品牌的官网与行业，补齐官网新闻页、X、GitHub、公众号候选渠道，并定义内置写作/排版预设。
2. 新增幂等 seedWeChatHot 与 CLI，使用 ON CONFLICT DO NOTHING 保留用户改动；接入根 package script 与 Docker setup。
3. 在 server.ts 增加管理员可读的 /api/studio/brands 与 /api/studio/presets，带 no-store/noindex；设置页读取并展示内置预设。
4. 增加 modules/wechathot/tests/seed.test.ts，覆盖品牌字段、渠道类型与 pending 规则、预设、幂等和 API 鉴权/响应头。
5. 运行 typecheck、模块测试、Web build、seed 与 backfill，核对验收标准后写 final-summary。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现结果：
- 新增 seed-data.ts，按 ENTITIES 生成 39 个品牌；名称/别名来自 ENTITIES，行业与官网按 brand-channels.md 补齐，notes 使用 topics.json 的公司定义，缺官网时回退 PUBLISHER_DOMAINS。
- 写入 113 个渠道：官网新闻/博客、X、GitHub、公众号候选；公众号全部 pending + dajiala，未确认的 GitHub 也保持 pending。
- 写入 2 个写作预设（科技快讯、行业洞察）和 2 个排版预设（公众号默认、紧凑排版），builtin=true。
- seedWeChatHot 使用 ON CONFLICT DO NOTHING 保持幂等且不覆盖用户编辑；新增 npm run seed:wechathot，并接入 Docker setup 与非 Docker 部署文档。
- 新增 /api/studio/brands（支持 q/industry）和 /api/studio/presets，管理员鉴权、no-store、noindex；设置页读取并展示内置预设。

验证：
- npm run typecheck 通过。
- modules/wechathot/tests/*.test.ts 10/10 通过（WCH-4 5 个 + WCH-5 5 个）。
- npm run build -w @aihot/web 通过；apps/web/tests/studio.test.ts 4/4 通过，包含设置页读取预设。
- 本机 seed：brands +39、channels +113、links +113、presets +4；再次运行全部 +0。
- npm run backfill:wechathot：441/441 投影成功，172 条 wc_event_meta 已有 brand_ids。
- 完整 npm test：741 通过、11 失败；模块测试全部通过。失败均为既有基线：architecture 仍报告后续任务才会使用的 wc_ 表/列、本机缺少 pg_dump 的备份测试、以及 WCH-3 将 / 重定向到 /studio 导致的 page-metadata 旧断言。
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-10-21T03:48:00Z

---

品牌与渠道核对已完成，见 docs/WeChatHot/brand-channels.md；X/公众号按 verified/user/pending 状态入库，未确认的不要标 verified。

---
<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成首批工作台种子与基础读取：39 个 ENTITIES 品牌（规范名、别名、行业、官网、topics 说明）、113 个官网/X/GitHub/公众号候选渠道（公众号全部 pending + dajiala，未确认 GitHub 也 pending）、2 个写作预设与 2 个排版预设。seedWeChatHot 幂等且不覆盖用户改动，已接入 npm run seed:wechathot、Docker setup 和非 Docker 部署文档。新增管理员可读的 /api/studio/brands（q/industry）与 /api/studio/presets，设置页展示内置预设。

验证：typecheck 通过；模块测试 10/10；Web build 通过，studio Web 测试 4/4（含设置页读取预设）；本机 seed +39/+113/+113/+4，二次运行 +0；backfill 441/441，172 条事件已有 brand_ids。完整 npm test 741 通过、11 失败，模块测试全过；失败均为既有基线（后续 wc_ 表/列、缺少 pg_dump、WCH-3 的 / 重定向导致旧 page-metadata 断言）。
<!-- SECTION:FINAL_SUMMARY:END -->
