---
id: WCH-33
title: 公开站下线与机器出口决策
status: Done
assignee: []
created_date: '2026-10-21T03:12:00Z'
updated_date: '2026-10-22T02:08:00Z'
labels:
  - frontend
  - cleanup
milestone: m-4
dependencies:
  - WCH-3
priority: medium
type: task
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
按 PRD 3.1 分阶段下线公开阅读页：从导航移除、noindex、删除公开阅读路由和日报/周报/月报页面；评估 RSS、API v1、MCP 的实际使用情况，决定保留或下线。任何阶段都不得让 wc_ 私有数据进入公开出口。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 公开阅读页不再可访问或明确重定向到 /studio
- [x] #2 RSS/API/MCP 的保留或下线有记录，且不输出 wc_ 数据
- [x] #3 站点地图、分享图和搜索索引不再包含公开阅读页
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 删除公开阅读路由（/all、/hot、日报周报月报、事件、条目、主题、收藏、关于等）与 public 站外壳，/ 与未知路径只保留 /studio。
2. 删除机器出口：/api/v1、RSS、llms.txt、sitemap、robots、manifest、OG 分享图、openapi、/api/mcp；保留 /api/health 与管理员/工作台接口。
3. 只拆 publication/ 的对外读取层，保留 publish 任务与 wc_ 事件投影依赖的写入/规则代码。
4. 删除公开页与出口的测试，重写 smoke 脚本为工作台+健康检查，更新架构测试和文档。
5. 跑 typecheck、web 构建、npm test、smoke，并确认没有任何 wc_ 数据出现在保留的出口。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
验证：npm run typecheck；npm run build -w @aihot/web + 19 个 web 测试；npm test 633/633；node scripts/smoke.ts 确认 22 个旧地址全部 404、/ 302 到 /studio、/api/health 正常。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
公开阅读站与机器出口已全部下线，提交 330849e 并推送 origin/main。

内容：
- 路由表只保留 `/` 跳转、工作台模块页与后台；删除公开阅读页与读者外壳、公开页面组件和对应测试。
- 删除 /api/v1、/api/site、RSS、MCP、llms.txt、sitemap、robots、manifest、OpenAPI、分享图与图片代理路由；保留 /api/health、管理员接口和带 token 的收录推送。
- 移除 IndexNow 定时任务、配置与环境变量，避免继续提交已下线页面。
- smoke 脚本改为验证旧地址返回 404；架构、部署、定制、PRD、AGENTS、README 同步更新。
- 顺带修复品牌库卡片：别名固定两行，行业标签不再被压缩裁切。

验证：typecheck、web 构建、web 测试 19/19、npm test 633/633、smoke 全过、迁移检查通过。

风险与后续：packages/backend/src/publication/ 仍留有只服务旧出口的读取模块（已无路由引用），已开 WCH-39 清理；这些代码不对外可见。反馈后台页仍在，但新反馈入口已下线。
<!-- SECTION:FINAL_SUMMARY:END -->
