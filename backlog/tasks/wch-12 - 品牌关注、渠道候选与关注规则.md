---
id: WCH-12
title: 品牌关注、渠道候选与关注规则
status: Done
assignee:
  - '@agent'
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T08:02:00Z'
labels:
  - backend
  - frontend
milestone: m-1
dependencies:
  - WCH-10
priority: high
type: feature
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现关注品牌后展示候选官网、X、微信公众号、微博、GitHub 等渠道，区分已验证官方、用户指定、待验证、暂不可用；支持勾选渠道、全部/重大/指定事件/关键词规则、取消关注、静音和屏蔽词。渠道与信源解耦，停用单渠道不影响品牌关注。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 关注品牌后可选择渠道并保存规则
- [x] #2 停用/删除单渠道后品牌关注仍有效，相关事件仍可查看
- [x] #3 规则、静音和屏蔽词可编辑并立即生效
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 扩展 wc_channel_brands：记录这个品牌是否关注该渠道、该渠道的暂停时间（迁移 0150/0151）。
2. 新增 modules/wechathot/follows.ts：关注规则的读写（全部/重大/指定发布/关键词）、关键词与屏蔽词、通知开关、频率、静音，以及品牌关注的取消；并提供事件是否命中规则的纯函数，供通知任务复用。
3. 新增接口 PUT/DELETE /api/studio/brands/:id/follow 与 PATCH /api/studio/channels/:id（验证状态、可用性、备注），写审计日志。
4. 品牌详情页补「关注」面板：规则、关键词、屏蔽词、事件类型、通知与频率、静音、渠道勾选与停用，取消关注。
5. 补接口与规则命中测试，并用浏览器在桌面和 375px 检查关注流程。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现记录：
- wc_channel_brands 增加 followed 与 muted_until：品牌关注哪些渠道、哪个渠道被暂停，都记在关系表上，渠道本身与信源仍然解耦（0150/0151）。
- 新增 modules/wechathot/follows.ts：关注规则的读写（全部/重大/指定发布/关键词）、关键词与屏蔽词、事件类型、通知开关、频率、静音，以及品牌关注的取消；规则命中判断是纯函数 followMatches，供通知任务复用。
- 接口：PUT/DELETE /api/studio/brands/:id/follow、PATCH /api/studio/brands/:id/channels/:channelId（关注或暂停单个渠道）、PATCH/DELETE /api/studio/channels/:id（验证状态、可用性、备注、删除），全部写审计日志。
- 品牌详情页补关注面板：规则、关键词、屏蔽词、事件类型、频率、静音、站内通知开关与渠道勾选；候选渠道列表可关注/停用、标记不可用和删除，删除渠道后品牌关注仍保留。
- 修掉一个真实缺陷：useStudioAction 以前对没有请求体的命令也声明 application/json，Fastify 因此返回 400，取消关注和删除渠道都点不动。
- 验证：typecheck、@aihot/web build、wechathot 36/36 测试（含新增 follows.test.ts 覆盖鉴权、规则保存、渠道停用与删除、取消关注和规则命中）；Playwright 在 1440px 与 375px 走完关注→保存→取消关注的完整流程，无横向溢出、无控制台错误。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成品牌关注：品牌详情页可以开始关注并保存规则（全部更新 / 仅重大事件 / 指定发布事件 / 自定义关键词）、关键词、屏蔽词、事件类型、通知开关、频率和静音，同时勾选要关注的渠道。取消关注只停用 watching，渠道和品牌资料都保留。

单个渠道可以随时停用、暂停或删除，品牌关注和规则不受影响，相关事件仍可查看；渠道的验证状态、可用性和备注也可以单独修改。规则命中判断写成纯函数 followMatches，屏蔽词、事件类型和四种规则的行为都有测试覆盖，通知任务直接复用它。

顺带修掉一个真实缺陷：Studio 的写操作以前对没有请求体的命令也声明 application/json，Fastify 因此返回 400，取消关注和删除渠道都点不动。

验证：npm run typecheck；npm run build -w @aihot/web；wechathot 36/36 测试通过，新增 follows.test.ts 覆盖鉴权、规则与渠道保存、停用/删除渠道、取消关注和规则命中；Playwright 在 1440px 和 375px 走完关注到取消关注的完整流程，无横向溢出、无控制台错误。
<!-- SECTION:FINAL_SUMMARY:END -->
