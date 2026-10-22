---
id: WCH-13
title: 信源健康与信源管理页
status: Done
assignee:
  - '@agent'
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T08:16:00Z'
labels:
  - backend
  - frontend
milestone: m-1
dependencies:
  - WCH-1
  - WCH-2
priority: high
type: feature
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
复用 admin/sources 能力实现 /studio/sources：列出官网、RSS、X、公众号、媒体等信源的健康状态、最近成功/失败、失败次数和错误；支持试抓、立即抓取、重试、启停和频率调整。状态从现有 health/last_error/fail_count 派生，不另造采集状态。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 能查看每个信源的状态、错误和最近抓取时间
- [x] #2 试抓、立即抓取、重试和启停可用，失败不影响其他信源
- [x] #3 公众号和 X 的付费/限流状态如实显示
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 复用 admin/sources 能力：信源列表补 updated_at（乐观编辑的版本号），Studio 直接调用 /api/admin/sources 的列表、详情、试抓、立即抓取和更新接口，不另造一套采集状态。
2. 新增 /studio/sources 页面：按健康度排序的信源列表，显示状态、最近成功/失败、失败次数、错误、频率、7 天条目与 30 天精选；筛选（关键词、类型、健康、启停）写进 URL。
3. 每个信源提供试抓、立即抓取/重试、启停和频率调整；失败只影响这一个信源。
4. 新增 /studio/sources/:id 详情页：状态、错误、最近抓取记录、最近条目和统计，同样可以试抓、立即抓取、启停和调频率。
5. 如实显示付费与限流状态：公众号按请求计费，X 走外部检索，失败原因直接显示。
6. 补页面测试（合成 api）并用浏览器在桌面和 375px 检查。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现记录：
- 不另造采集状态：Studio 直接复用 admin/sources 的列表、详情、试抓、立即抓取和更新接口（同一管理员会话与 CSRF）。只给信源列表行补了 updated_at，作为乐观编辑的版本号。
- /studio/sources 页面按健康度排序，显示状态、失败次数、错误、上次成功/上次抓取/下次抓取、频率、7 天条目和 30 天精选；关键词、类型、健康、启停筛选写进 URL。
- 每个信源可试抓（不落库，只预览候选）、立即抓取、失败时显示重试抓取、启停和调整频率；操作只影响这一个信源。
- /studio/sources/:id 详情页显示状态与错误、最近抓取记录和最近条目，同样的命令。
- 付费与限流如实显示：公众号标注「按请求计费」，X 标注「外部检索·有限额」，失败原因直接显示在行内。
- 验证：typecheck、@aihot/web build、apps/web/tests/studio-sources.test.ts；Playwright 在 1440px 与 375px 检查列表与详情，无横向溢出、无控制台错误，暂停与启用即时生效并已恢复原状。修掉了详情页在 375px 下的横向溢出（网格项缺少 min-w-0）。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成 /studio/sources 信源健康与管理页：按健康度排序的信源列表，显示状态、失败次数、错误原因、上次成功与上次抓取时间、抓取频率、7 天条目和 30 天精选，并支持关键词、类型、健康和启停筛选（状态写在 URL 里）。

每个信源都可以试抓（只预览候选、不落库）、立即抓取、失败时重试、启停和调整频率；每个操作只影响这一个信源。新增 /studio/sources/:id 详情页，显示状态与错误、最近抓取记录和最近条目，同样的命令。

付费与限流如实呈现：公众号标注「按请求计费」，X 标注「外部检索·有限额」，失败原因直接显示。状态全部来自引擎现有的 health、last_error、fail_count，没有另造一套采集状态。

验证：npm run typecheck；npm run build -w @aihot/web；新增 apps/web/tests/studio-sources.test.ts 覆盖列表与详情；Playwright 在 1440px 和 375px 检查列表与详情，无横向溢出、无控制台错误，暂停与启用即时生效。
<!-- SECTION:FINAL_SUMMARY:END -->
