---
id: WCH-2
title: 建立 wc_ 工作台数据表与迁移
status: Done
assignee:
  - '@suxin'
created_date: '2026-10-21T03:10:00Z'
updated_date: '2026-10-21T04:30:00Z'
labels:
  - data
  - migration
milestone: m-0
dependencies:
  - WCH-1
priority: high
type: feature
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在 modules/wechathot/migrations/ 从 0100 起建立 wc_brands、wc_channels、wc_channel_brands、wc_event_meta、wc_follows、wc_event_states、wc_topics、wc_articles、wc_article_versions、wc_style_presets、wc_alerts。每个文件只放一条允许在线执行的语句；表之间外键、唯一键和必要索引齐全，所有表为单用户模型，不加 user_id。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 空库和已有 AIHOT 数据的库都能按顺序执行迁移，重复执行不报错
- [x] #2 外键、唯一约束和常用筛选索引齐全；wc_topics 与 AIHOT topics、wc_articles 与 AIHOT articles 不冲突
- [x] #3 迁移符合从 0055 起的一条语句规则，且没有改写已发布迁移
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 在 modules/wechathot/migrations/ 从 0100 起，每张表一个 CREATE TABLE 文件：wc_brands、wc_channels、wc_channel_brands、wc_event_brands（PRD 6.1，已确认一并建立）、wc_event_meta、wc_follows、wc_event_states、wc_style_presets、wc_topics、wc_articles、wc_article_versions、wc_alerts。
2. 在表定义内补齐外键（sources、stories、wc_ 内部表）、唯一约束、状态/类型 CHECK 和单用户模型；不添加 user_id。
3. 为常用筛选和反向外键查询增加独立 CREATE INDEX CONCURRENTLY IF NOT EXISTS 迁移：事件分类/品牌/渠道/来源等级 GIN、时间/热度/评分、选题状态、文章状态、通知状态等。
4. 用临时 PostgreSQL 17 容器验证：空库连续执行两次迁移；从现有 AIHOT 库 dump/restore 一份后执行两次；检查表、外键、唯一键和索引齐全，且无同名冲突。
5. 运行 node scripts/check-migrations.ts --base HEAD 和 npm run typecheck，逐条核对验收标准后记录结果。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现：新增 36 个模块迁移（0100–0111 共 12 张表，0120–0143 共 24 个并发索引）。表内包含 13 个外键、PK/UNIQUE 约束、状态 CHECK、jsonb/数组默认值和单用户模型；没有 user_id。按 PRD 6.1 与用户确认，额外建立了 wc_event_brands。
验证：
- 空 PostgreSQL 17 库执行 94 个迁移成功，第二次执行输出 database is up to date。
- 从现有 AIHOT 库（58 条迁移、4714 篇文章、443 个事件）dump/restore 到临时库后执行 36 个新迁移成功，第二次执行输出 database is up to date；总计 94 条迁移。
- 目录检查：12 张 wc_ 表、13 个外键、5 个 UNIQUE 约束、41 个 wc_ 索引，无 user_id；AIHOT 的 topics 已由 0045 删除，wc_topics/wc_articles 与 AIHOT articles 不冲突。
- 事务内插入品牌、渠道、关注、预设、事件元数据、事件品牌、事件状态、选题、稿件、版本和通知全部成功后回滚。
- node scripts/check-migrations.ts --base HEAD 通过；npm run typecheck 通过；npm run test:standalone 181 项通过；tests/migrations.test.ts 6 项通过。
- npm test 的备份用例因本机没有 pg_dump（spawn pg_dump ENOENT）失败，与迁移改动无关；数据库迁移和 standalone 测试已单独通过。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
在 modules/wechathot/migrations/ 建立 0100–0111 的 12 张 wc_ 表和 0120–0143 的 24 个并发索引，覆盖 PRD 6.1 的品牌、渠道、事件扩展、关注、事件状态、选题、稿件、版本、预设和通知；包含 13 个外键、唯一约束、状态 CHECK 及常用筛选索引，全部为单用户模型。额外按 PRD 与用户确认加入 wc_event_brands。

验证：空库和现有 AIHOT 数据的克隆库均按顺序执行 94 个迁移成功，重复执行不报错；check-migrations、typecheck、standalone 和 migrations 测试通过。完整 npm test 中仅备份相关用例因本机缺少 pg_dump 失败。
<!-- SECTION:FINAL_SUMMARY:END -->
