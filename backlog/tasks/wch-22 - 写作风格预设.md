---
id: WCH-22
title: 写作风格预设
status: Done
assignee:
  - '@agent'
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T09:08:00Z'
labels:
  - backend
  - frontend
milestone: m-2
dependencies:
  - WCH-2
priority: medium
type: feature
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 wc_style_presets 的读取与编辑：栏目、目标读者、字数、语气、标题偏好、禁止表达；提供内置预设并允许用户新建/修改。创建选题和写作时默认套用选题栏目对应的预设，用户可临时覆盖。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 设置页可查看、编辑和新建风格预设
- [x] #2 新建选题和写作步骤能套用预设，临时覆盖不改变预设本身
- [x] #3 删除被使用的预设时有明确提示或回退到默认预设
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 新增 modules/wechathot/presets.ts：风格预设的读取、新建、编辑和删除；内置预设不能删，删除用户预设时返回回退到哪个默认预设。
2. 新增接口 POST/PATCH/DELETE /api/studio/presets，写审计日志。
3. wc_topics 增加 style_preset_id：选题可以临时换用某个预设，不改动预设本身。
4. 设置页补风格预设的查看、编辑、新建和删除；选题详情页显示套用的预设并可临时换用。
5. 补接口测试与页面测试。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现记录：
- 新增 modules/wechathot/presets.ts：写作风格预设的读取、新建、编辑和删除；内置预设可以改内容但不能删除，删除自有预设时返回该栏目会回退到哪个内置预设。
- 新增接口 POST /api/studio/presets、PATCH /api/studio/presets/:id、DELETE /api/studio/presets/:id，写审计日志。
- wc_topics 增加 style_preset_id（0153）：选题可以临时换用某个预设，预设本身不变；没有指定时按栏目套用内置预设。
- 设置页补「新建风格预设」与每张卡片的编辑/删除；选题详情页新增「写作风格」选择和当前预设的目标读者、字数与语气。
- 栏目默认预设固定为内置预设（自有预设是备选，需要在选题里显式选用），这样改预设不会悄悄改掉既有选题的默认。
- 修掉两处真实问题：zod v4 里 .partial() 不能用于带 refine 的对象（改成先定义字段再分别 refine）；迁移安全检查不接受带外键的 ADD COLUMN（改为不加外键，由代码校验预设是否存在）。
- 验证：typecheck、@aihot/web build、wechathot 63/63 测试（新增 presets.test.ts 覆盖新建、编辑、内置不可删、删除回退、选题跟随栏目与临时换用、鉴权）；Playwright 在 1440px 与 375px 检查设置页新建预设与选题换用预设，无横向溢出、无控制台错误，检查用数据已清理。
- 备注：apps/web 的 navigation-performance 用例在并行跑时不稳定（单独跑或串行跑都通过），与本次改动无关。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成写作风格预设：设置页可以查看、新建、编辑和删除风格预设（栏目、目标读者、字数、语气、标题偏好、禁止表达）。内置预设可以改内容但不能删除；删除自有预设时会明确告诉使用者该栏目将回退到哪个内置预设。

新建的选题和后续写作步骤默认按栏目套用对应的预设，选题详情页可以临时换用另一个预设，只影响这个选题，预设本身不会被改动。

验证：npm run typecheck；npm run build -w @aihot/web；wechathot 63/63 测试通过，新增 presets.test.ts 覆盖新建、编辑、内置不可删、删除回退、选题跟随栏目与临时换用；Playwright 在 1440px 和 375px 检查设置页与选题页，无横向溢出、无控制台错误。
<!-- SECTION:FINAL_SUMMARY:END -->
