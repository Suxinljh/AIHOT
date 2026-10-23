---
id: WCH-42
title: 修复集成配置只填部分密钥时无法保存
status: Done
assignee: []
created_date: '2026-10-23T02:39:00Z'
updated_date: '2026-10-23T02:39:00Z'
labels:
  - frontend
  - backend
milestone: m-3
dependencies: []
priority: high
type: bug
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
设置页只提交用户填写的密钥，但接口用 z.record(enum) 校验，Zod 4 要求所有密钥键都存在，导致只配飞书、SMTP 留空时报 LLM_API_KEY/SMTP_URL 等 Invalid input。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 只提交已填写的密钥也能保存集成配置
- [x] #2 未提交的密钥保持原值
- [x] #3 未知密钥键仍被拒绝
- [x] #4 回归测试、typecheck 与 npm test 通过
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 集成配置 PATCH 的 plain/secrets 校验改用 z.partialRecord，允许省略字段。
2. 补接口测试：只提交飞书密钥、二次保存不覆盖、未知键拒绝。
3. 文档补充 SMTP 配置与 Cloudflare Email Service 示例。
4. 跑 typecheck、npm test。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
根因：Zod 4 的 z.record(z.enum(KEYS), ...) 要求所有键都存在；设置页只发送填写过的密钥。改为 z.partialRecord 后，只填飞书三项即可保存，SMTP 等留空的键保持原值。新增 modules/wechathot/tests/integrations.test.ts 3 个用例；npm test 672/672。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
集成配置允许只提交部分密钥；补回归测试与 Cloudflare/通用 SMTP 文档。
<!-- SECTION:FINAL_SUMMARY:END -->
