---
id: WCH-14
title: GitHub 仓库 Release 订阅流程
status: Done
assignee:
  - '@agent'
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T08:26:00Z'
labels:
  - backend
  - frontend
milestone: m-1
dependencies:
  - WCH-13
priority: high
type: feature
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 /studio/sources/new 的 GitHub 分支：粘贴仓库 URL，调用 GitHub API 验证公开可访问，判断 owner 是否为品牌官方组织，创建 releases.atom RSS 信源并试抓预览。P0 不新增 github 信源类型；可选 GITHUB_TOKEN 提高限额。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 公开仓库可创建 Release 订阅并预览版本号、说明和链接
- [x] #2 私有/不存在仓库给出明确错误，不保存半成品信源
- [x] #3 官方组织与第三方仓库的关联状态可区分
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 新增 modules/wechathot/github.ts：解析仓库地址，调用 GitHub API 校验仓库公开可访问并取最新 Release；用官网与已验证渠道判断 owner 是否为品牌官方组织；用 releases.atom 试抓预览版本号、说明和链接。
2. 校验通过且预览成功才创建 RSS 信源（不新增 github 信源类型），并把仓库登记为品牌候选渠道；失败时给出明确错误，不留半成品。
3. 新增接口 POST /api/studio/sources/github/check 与 POST /api/studio/sources/github，写审计日志。
4. 新增 /studio/sources/new 页面：GitHub 分支、校验结果、官方与第三方的区分、创建订阅与预览结果。
5. 补接口测试（合成 GitHub 响应）与页面测试，并用浏览器检查。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现记录：
- 新增 modules/wechathot/github.ts：解析仓库地址（完整 URL 或 owner/repo），调用 GitHub API 校验仓库公开可访问并取最近 5 个 Release；可选 GITHUB_TOKEN 提高限额（沿用 collectors 凭据）。
- 官方组织的判断有证据：品牌官网指向该 GitHub 账号、品牌实体 ID 一致，或品牌已关联该 GitHub 渠道（已验证才算官方）；只有名称相似的品牌列为候选，由使用者确认。
- 订阅走 releases.atom 的普通 RSS 信源，不新增 github 信源类型：先试抓预览，预览失败就不保存，仓库同时登记为品牌候选渠道（官方则标为已验证）。
- 接口 POST /api/studio/sources/github/check 与 POST /api/studio/sources/github，写审计日志。
- 新增 /studio/sources/new 页面（GitHub 分支），信源列表增加「添加信源」入口。
- 验证：typecheck、@aihot/web build、wechathot 42/42 测试（新增 github.test.ts 覆盖地址解析、官方判定、创建订阅与预览、重复订阅、私有仓库、预览失败不留半成品）；apps/web/tests/studio-source-new.test.ts 覆盖页面；Playwright 在 1440px 与 375px 检查页面与错误状态，无横向溢出、无控制台错误。本机没有到 api.github.com 的外网访问，真实 GitHub 调用由替身响应覆盖，页面的失败路径已在浏览器里验证。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成 GitHub Release 订阅流程：在 /studio/sources/new 的 GitHub 分支粘贴仓库地址，先向 GitHub API 核对仓库是否公开可访问并列出最近的 Release（版本号、说明和链接），确认后再创建订阅。订阅是普通的 releases.atom RSS 信源，不新增信源类型；仓库同时登记为品牌的候选渠道。

官方与第三方可以区分：品牌官网指向该账号、实体 ID 一致或品牌已验证过该渠道时算官方组织（信源 T1、渠道已验证并关联品牌），只有名称相似的品牌只作为候选列出，由使用者确认。私有或不存在的仓库给出明确错误，Release 订阅地址取不到内容时不会保存任何信源，不留半成品。

验证：npm run typecheck；npm run build -w @aihot/web；wechathot 42/42 测试通过，新增 github.test.ts 覆盖地址解析、官方判定、创建与预览、重复订阅、私有仓库和预览失败；apps/web/tests/studio-source-new.test.ts 覆盖页面；Playwright 在 1440px 和 375px 检查页面与错误状态，无横向溢出、无控制台错误。本机没有到 api.github.com 的外网访问，真实调用由替身响应覆盖。
<!-- SECTION:FINAL_SUMMARY:END -->
