---
id: WCH-10
title: 品牌库接口
status: Done
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T06:46:00Z'
labels:
  - backend
  - api
milestone: m-1
dependencies:
  - WCH-2
  - WCH-5
priority: high
type: feature
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现品牌库 CRUD 与搜索：规范名、别名、行业、官网、Logo、实体映射、验证状态；支持合并重复品牌并把别名、渠道、事件关系迁移到存活品牌。列表支持按行业和关注状态筛选。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 品牌可新增、编辑、搜索和按行业筛选
- [x] #2 合并品牌后别名、渠道和事件关系不丢失
- [x] #3 名称重复和非法行业返回可读错误
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 扩展 studio-types：品牌列表关注状态、渠道/事件/关注详情与合并结果。
2. 新增 modules/wechathot/brands.ts：zod 校验、品牌列表/详情、创建/编辑/删除、合并事务。
3. 合并事务迁移别名、渠道关系、事件关系、wc_event_meta.brand_ids 和 wc_follows，并写审计。
4. 在 server.ts 增加带管理员会话、CSRF、no-store/noindex 与可读错误的 /api/studio/brands 写接口。
5. 新增模块测试覆盖 CRUD、搜索/行业/关注筛选、合并保留关系、重复名称与非法行业、鉴权和 CSRF。
6. 运行 typecheck 与模块测试，核对验收标准后提交。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- 端点：GET /api/studio/brands（q、industry、followed）、GET /api/studio/brands/:id、POST /api/studio/brands、PATCH/DELETE /api/studio/brands/:id、POST /api/studio/brands/merge 与 POST /api/studio/brands/:id/merge。
- 写接口统一走 studioHandler：管理员会话 + x-csrf-token；响应 no-store/noindex；Zod 与冲突分别映射为 400/409 可读错误。
- 合并事务：别名取并集；渠道和事件关系先 INSERT ... ON CONFLICT DO NOTHING 再删除源关系；按 wc_event_brands 重建 wc_event_meta.brand_ids；关注去重合并，并把 wc_alerts.rule_id 指向存活关注；删除源品牌后再迁移 entity_id，避免唯一约束冲突。
- 删除品牌只移除关注、渠道/事件关系和 wc_event_meta.brand_ids，保留事件与渠道。
- 验证：npm run typecheck 通过；模块测试 17/17 通过；git diff --check 通过。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
实现 /api/studio/brands 的列表、搜索、详情、新建、编辑、删除和合并。列表支持 q、industry、followed 筛选；详情返回渠道、关联事件、关注状态与计数；写接口沿用管理员会话和 CSRF，并记录审计。合并事务迁移别名、渠道关系、事件关系、wc_event_meta.brand_ids、关注和 wc_alerts.rule_id，重复名称/ID 与非法行业返回可读的 400/409 错误。

验证：npm run typecheck；模块测试 17/17（brands 7、events 5、seed 5）；git diff --check。风险：行业校验跟随当前 taxonomy，WCH-35 迁移到 7 类后自动按新 key 生效；品牌详情事件目前最多返回 50 条，后续如需要可在 WCH-11 加分页。
<!-- SECTION:FINAL_SUMMARY:END -->
