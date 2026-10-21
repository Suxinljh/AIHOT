---
id: WCH-4
title: 事件投影任务与首轮回填
status: Done
assignee:
  - '@suxin'
created_date: '2026-10-21T03:10:00Z'
updated_date: '2026-10-21T06:12:00Z'
labels:
  - backend
  - worker
milestone: m-0
dependencies:
  - WCH-2
priority: high
type: feature
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 worker 定时投影：把 stories/facts/analyses 聚合进 wc_event_meta，写分类、品牌、渠道类型、来源等级、报道数、首发/最近时间、热度和核实状态。使用 entityIdentity() 映射品牌；合并事件时迁移选题、状态和关注引用。提供可重复执行的首轮回填命令。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 回填后工作台能读到与 AIHOT 事件一致的事件数量和主要字段
- [x] #2 同一事件重复投影不产生重复行；合并事件后旧引用迁移到存活 story_id
- [x] #3 单个事件投影失败不阻断其他事件和公开链路
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 在 modules/wechathot/events.ts 实现事件投影：按存活事件读取 stories/facts/analyses/publications，聚合分类、品牌、渠道类型、来源等级、报道数、首发/最近时间、热度、事件类型和核实状态；用 entityIdentity() 映射已有 wc_brands，写 wc_event_meta 与 wc_event_brands，保留评分字段。
2. 跟随 stories.merged_into 迁移 wc_topics、wc_event_states、wc_event_brands、wc_alerts 到存活 story，删除旧 wc_event_meta；每个事件和每次合并单独 try/catch，失败不阻断其他事件。
3. 在 server.ts 注册每 5 分钟扫描最近 30 天存活事件的调度；新增 modules/wechathot/scripts/backfill-events.ts 和根命令 backfill:wechathot，支持可重复全量回填。
4. 增加模块数据库测试：字段聚合、重复投影幂等、合并引用迁移、单事件失败隔离。
5. 跑 typecheck、模块测试和 smoke，更新 WCH-4 验收与 final summary，提交代码。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现：
- `modules/wechathot/events.ts` 从 stories/facts/publications/analyses 投影事件读模型，聚合分类、品牌、渠道类型、来源等级、报道数/来源数、首发/最近时间、热度、事件类型、核实状态和已更新标记；代表报道优先取精选报道，事件类型取代表报道的分类标签；品牌通过 `entityIdentity()` 映射已有 `wc_brands`，渠道类型优先读 `wc_channels`，否则按来源类型/域名/一手来源回退。
- 投影 upsert 只覆盖投影字段，保留 `editorial_score`、`score_dims`、`score_reason`、`score_missing`、`score_fingerprint`、`scored_at`，并保留人工 `disputed`。
- `migrateMergedEventReferences()` 解析完整 `merged_into` 链，迁移 `wc_topics`、`wc_event_states`、`wc_event_brands`、`wc_alerts`，删除旧 `wc_event_meta`；单个事件/合并失败单独捕获，不阻断其他事件。
- `server.ts` 注册 `wechathot.events.project`（`*/5 * * * *`，最近 30 天）；新增 `npm run backfill:wechathot`（默认全量，`-- --recent` 为 30 天窗口），可重复执行。

验证：
- `npm run typecheck` 通过。
- `modules/wechathot/tests/events.test.ts` 5/5 通过：字段聚合、幂等与评分字段保留、合并引用迁移、合并链、单事件失败隔离。
- 关联 DB 测试 `tests/events.test.ts`、`tests/hot.test.ts`、`tests/content-publication.test.ts` 与模块测试共 60/60 通过。
- `npm run build -w @aihot/web` 通过；`scripts/smoke.ts` 全部检查通过。
- 本地回填：441 个存活事件，441 行 `wc_event_meta`，0 失败；再次执行行数不变。
- Docker worker 重建后 `job_runs` 记录 `wechathot.events.project` 成功，`pgboss.schedule` 存在 `cron.wechathot.events.project`。

已知边界：
- 本地 `wc_brands` 为空，`brand_ids` 暂为空，等 WCH-5 品牌种子写入后生效；投影对空品牌表不报错。
- 本地 `story_signals` 最新时间早于 48 小时，回填后 `heat` 为空；有当前信号的测试事件已验证热度 > 0。
- 全量 `tests/architecture.test.ts` 仍报告 WCH-2 建表但尚未被后续任务使用的 `wc_` 表/列（WCH-5/6/9/15/16 会使用），不是本次投影引入的失败。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
已实现工作台事件投影与首轮回填：`modules/wechathot/events.ts` 从 stories/facts/publications/analyses 聚合 `wc_event_meta` 与 `wc_event_brands`，包含分类、品牌、渠道类型、来源等级、报道数/来源数、首发/最近时间、热度、事件类型、核实状态和已更新标记；品牌经 `entityIdentity()` 映射已有品牌，投影不调用模型，且保留评分字段与人工争议状态。

合并引用迁移会沿完整 `merged_into` 链迁移 `wc_topics`、`wc_event_states`、`wc_event_brands`、`wc_alerts`，删除旧 `wc_event_meta`；单个事件或合并失败单独捕获，不影响其他事件与公开链路。worker 注册每 5 分钟 `wechathot.events.project`，并提供可重复执行的 `npm run backfill:wechathot`（`-- --recent` 为 30 天窗口）。

验证：typecheck 通过；模块测试 5/5、关联 DB 测试合计 60/60 通过；web 构建与 smoke 全部通过；本地全量回填 441 个存活事件得到 441 行 meta、0 失败，重复执行行数不变；Docker worker 的 `job_runs` 与 pg-boss schedule 均记录该任务成功。

已知边界：本地 `wc_brands` 为空，品牌字段待 WCH-5 种子后生效；本地信号早于 48 小时，回填热度为空（有当前信号的测试事件已验证热度 > 0）；architecture 测试仍列出 WCH-2 中留给后续任务使用的 `wc_` 表/列，属于既有基线，不是本次投影引入。
<!-- SECTION:FINAL_SUMMARY:END -->
