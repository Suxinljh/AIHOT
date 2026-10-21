---
id: WCH-3
title: Studio 外壳、登录与根路径重定向
status: Done
assignee:
  - '@suxin'
created_date: '2026-10-21T03:10:00Z'
updated_date: '2026-10-21T05:27:00Z'
labels:
  - frontend
  - auth
milestone: m-0
dependencies:
  - WCH-1
priority: high
type: feature
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 /studio 的私有壳层：桌面侧栏、移动底栏、顶部栏、登录校验、退出登录、页面标题和空状态。所有响应 no-store，页面 noindex/nofollow；/ 重定向到 /studio，未登录时先登录再回到工作台。导航先放五个一级入口的空页面。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 / 访问进入 /studio；未登录完成登录后回到 /studio
- [x] #2 桌面与 375px 视口下导航可用；Studio 响应带 no-store 和 noindex
- [x] #3 普通访客不能读取任何 Studio 页面或接口
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 在 modules/wechathot 增加 Studio 私有布局路由和五个一级入口空页面，实现桌面侧栏、375px 底栏、顶部栏、退出登录、页面标题和空状态。
2. 布局 loader 通过管理员会话校验；登录返回路径允许 /studio；所有 Studio 页面和接口返回 no-store、noindex。
3. 在模块声明里增加 / -> /studio 重定向，并让根壳层对 /studio 使用工作台自己的框架。
4. 增加 /api/studio/me 私有接口与测试，验证访客 401、登录用户 200。
5. 运行 typecheck、build、相关测试；用浏览器检查桌面和 375px 导航、未登录跳转和登录后返回。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现与验证记录：
- modules/wechathot 新增 pathless Studio 布局与五个一级页面；桌面侧栏、顶部栏、375px 底栏、页面标题、空状态和退出登录均已落地。
- 布局 loader 每次导航调用 /api/studio/me；未登录由 adminGet 送到登录页，return 仅允许 /admin 与 /studio。
- / 302 到 /studio；root.tsx 对 /studio 绕过公开阅读壳层；Studio 页面和接口返回 private, no-store 与 noindex, nofollow。
- 修复 /api/auth/logout 的 URL-encoded 表单解析，桌面与移动端退出登录都能回到登录页。
- 公开站测试从 / 改到 /all，并让 /all 透传上游缓存头；smoke 改为校验 / 与 /studio 的重定向。

验证：
- npm run typecheck 通过。
- npm run build -w @aihot/web 通过；node --test apps/web/tests/*.test.ts 52/52 通过。
- DATABASE_URL=..._test 下 tests/admin-session-revocation.test.ts 与 tests/private-routes.test.ts 20/20 通过。
- node scripts/smoke.ts --base http://localhost:3000 全部通过。
- Playwright 在 1440px 与 375px 实测五个入口、登录回跳、退出登录；访客访问五个 Studio 路径均 302 到登录页，/api/studio/me 返回 401。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成 WCH-3。Studio 现在有独立私有壳层（桌面侧栏、顶部栏、375px 底栏）、五个一级入口空页面、每次导航的管理员会话校验和退出登录；/ 302 到 /studio，未登录先登录并回到原 Studio 路径。Studio 页面和 /api/studio/me 均返回 private, no-store 与 noindex, nofollow；访客访问任一 Studio 页面都被送到登录页，接口返回 401。顺带修复了登出表单 415，公开站测试改用 /all，smoke 校验新入口。

验证：typecheck、web build、52 个 web 测试、20 个相关 DB 测试、smoke 全部通过；Playwright 在 1440px 和 375px 实测五个入口、登录回跳和退出登录。风险/后续：公开阅读页仍在，WCH-33 处理其下线与机器出口决策；未运行完整 npm test（仓库既有 pg_dump 备份用例依赖宿主工具）。
<!-- SECTION:FINAL_SUMMARY:END -->
