---
id: WCH-18
title: 写作队列与角度、大纲生成
status: Done
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T09:17:00Z'
labels:
  - backend
  - ai
  - worker
milestone: m-2
dependencies:
  - WCH-17
  - WCH-22
priority: high
type: feature
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
建立 wechathot.write 队列和 angle/outline 步骤，使用 chatJson + zod schema、subject 回执和预算；输入事件证据包、栏目、用户备注和风格预设；输出候选角度与理由、章节大纲。支持快速写作一次串联，分步写作由用户逐步触发。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 可从选题生成多个角度并选择其一
- [x] #2 选择角度后能生成可编辑大纲，支持重生成和手动改写
- [x] #3 队列失败可重试，不重复扣费，不丢失已有步骤结果
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现记录：
- 新增模块队列 wechathot.write（ModuleQueue，defineQueue）：一次一个写作步骤，失败重试两次；队列的 run 把每一步交给 runWriteStep。
- 新增模型步骤 angleIdeas（候选角度）和 outline（章节大纲），走引擎既有的回执与预算；同一份输入重试时回执复用，不重复扣费。
- 新增 modules/wechathot/writing.ts：两个步骤的提示词与 schema、状态写入和队列封装；输入是选题冻结的来源快照、栏目、备注和套用的风格预设。
- wc_topics 增加 writing 列（0154），保存候选角度、大纲和步骤状态（pending/done/failed 与错误原因）；选题详情页可读可改。
- 接口：POST /api/studio/topics/:id/angles 与 /outline 立刻返回 202 并把步骤放进队列；PATCH /api/studio/topics/:id 支持直接改写大纲。
- 选题详情页新增「候选角度与大纲」区：生成/重新生成角度、选用一个角度、生成/重新生成大纲、逐节手改标题与要点并保存；生成中自动刷新，失败显示原因并可重试。
- 验证：typecheck、@aihot/web build、wechathot 68/68 测试（新增 writing.test.ts 覆盖角度生成、缺角度的大纲被拒、选定角度后的大纲、手改大纲、失败保留旧结果并可重试、队列接口与鉴权）；Playwright 在 1440px 与 375px 检查写作区，无横向溢出、无控制台错误，生成按钮能入队。检查用选题已清理。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成写作队列与角度、大纲生成：选题详情页可以生成多个候选角度（每个角度带理由），选一个之后生成章节大纲；大纲可以逐节手动改写并保存，也可以重新生成。两个步骤都跑在模块自己的 wechathot.write 队列里，点击立即返回，模型调用由 worker 完成，走引擎既有的回执与预算熔断。

失败不会丢掉已有结果：角度失败时大纲仍在，重试时同一份输入复用回执，不重复扣费；页面显示失败原因并提供重试。选定角度前请求大纲会被明确拒绝。

验证：npm run typecheck；npm run build -w @aihot/web；wechathot 68/68 测试通过，新增 writing.test.ts 覆盖角度、大纲、手改大纲、失败重试和队列接口；Playwright 在 1440px 和 375px 检查写作区，无横向溢出、无控制台错误。
<!-- SECTION:FINAL_SUMMARY:END -->
