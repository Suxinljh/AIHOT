---
id: WCH-1
title: 搭建 wechathot 模块并注册到站点
status: Done
assignee:
  - '@suxin'
created_date: '2026-10-21T03:10:00Z'
updated_date: '2026-10-21T04:12:00Z'
labels:
  - infra
  - module
milestone: m-0
dependencies: []
priority: high
type: feature
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
创建 modules/wechathot/ 作为 @aihot/wechathot 包，提供 module.ts、server.ts、web.tsx 与占位 /studio 页面；在 site/modules/index.ts、server.ts、web.ts 注册，并在 site/package.json 和 Dockerfile 增加依赖与 COPY。模块内所有工作台代码自包含，不修改框架业务逻辑。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 npm run typecheck 和 npm run build -w @aihot/web 通过
- [x] #2 /studio 返回模块占位页，API、worker、web 三端都能加载模块
- [x] #3 模块可从 site/modules 的注册清单加载，移除后不影响其他模块
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 新建 modules/wechathot 包：package.json、module.ts、server.ts、web.tsx，并在 web/studio.tsx 放占位页。
2. 在 site/modules/index.ts、server.ts、web.ts 注册地址、后端和网页插口；site/package.json 增加依赖。
3. Dockerfile 增加模块 package.json 的 COPY 行，更新 package-lock。
4. 运行 npm run typecheck 和 npm run build -w @aihot/web；检查 /studio 路由和模块注册。
5. 逐条核对 WCH-1 验收标准并记录最终结果。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现：新增 @aihot/wechathot 包（module.ts、server.ts、web.tsx、web/studio.tsx），在 site/modules 三份清单注册，site/package.json 与 Dockerfile/package-lock 增加依赖。

验证（Node v24.14.0）：
- npm run typecheck 通过。
- npm run build -w @aihot/web 通过，产物含 studio 与 wechathot。
- 以 WEB_PORT=3211 启动生产 web server，浏览器打开 /studio：HTTP 200，标题 Studio · WeChatHot，h1 工作台底座已就位，meta robots noindex,nofollow，console 无错误。
- 直接导入 site/modules：MODULES=[wechathot]，SERVER_MODULES=[list-translate,wechathot]；installModules 后 serverModules 含 wechathot。
- npm ci --dry-run 通过，package-lock 与 workspace 依赖一致。
- 未启动 API/worker 进程（本机无 PostgreSQL）；两者启动时执行同一个 installModules(SERVER_MODULES) 路径，已用上述导入验证。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
新增 @aihot/wechathot：module.ts 注册 /studio 占位页，server.ts 提供可安装的后端 socket，web.tsx 提供网页 socket，web/studio.tsx 是不调用模型、noindex 的占位页。站点通过 site/modules 三份清单加载模块，site/package.json、package-lock、Dockerfile COPY 已补齐；没有改框架业务逻辑。

验证（Node v24.14.0）：npm run typecheck、npm run build -w @aihot/web 通过；浏览器打开 /studio 返回 200，标题与占位内容正确，meta noindex,nofollow，console 无错误；直接导入 site/modules 后 MODULES/SERVER_MODULES 均含 wechathot，installModules 后 serverModules 含 wechathot；npm ci --dry-run 通过。

本机没有 PostgreSQL，未实际启动 API/worker 进程；两者启动时执行相同的 installModules(SERVER_MODULES)，已通过直接导入验证。`/` 重定向、登录和 Studio 私有外壳留给 WCH-3。
<!-- SECTION:FINAL_SUMMARY:END -->
