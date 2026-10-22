---
id: WCH-19
title: 正文与标题生成
status: Done
assignee:
  - '@agent'
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T09:27:00Z'
labels:
  - backend
  - ai
  - worker
milestone: m-2
dependencies:
  - WCH-18
priority: high
type: feature
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 body/title 写作步骤：按大纲分节生成正文，支持整篇和按章节生成；生成直述型、问题型、观点型标题候选。正文必须带证据引用，区分官方、媒体、未证实和作者判断；结果写回 wc_articles 并建立版本。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 能从已确认大纲生成资讯/洞察正文和多个标题候选
- [x] #2 正文中的事实、数字、日期和来源可追溯到证据包
- [x] #3 支持按章节重生成、扩写、精简和调整语气，且不覆盖其他章节
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 新增 modules/wechathot/articles.ts：从选题创建稿件（栏目、角度、大纲、风格预设），写 wc_articles 并建立首个版本。
2. 新增模型步骤 body 与 titles：按大纲分节生成正文（整篇或单节，可带扩写/精简/语气要求），生成直述型、问题型、观点型标题候选；正文段落标注官方/媒体/未证实/作者判断并引用证据包里的来源。
3. 引用只接受证据包里的来源；模型编造的来源被丢弃并记录。
4. 接口：POST /api/studio/topics/:id/article、GET /api/studio/articles/:id、POST /api/studio/articles/:id/body、POST /api/studio/articles/:id/titles、PATCH /api/studio/articles/:id，每次改动留一个版本。
5. 新增 /studio/articles/:id 页面：显示正文、来源标注和标题候选，可重新生成整篇或某一节。
6. 补测试并用浏览器检查。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现记录：
- 新增 modules/wechathot/articles.ts：选题变成稿件（wc_articles，带栏目、角度、大纲、风格预设），并写下第一个版本；稿件内容用 TipTap 形状的 doc（每节一个 heading，段落带 kind 与 sources）。
- 新增模型步骤 body 与 titles：正文按大纲分节生成，标题给直述型、问题型、观点型候选；输入是选题冻结的来源快照、栏目、备注和套用的风格预设。
- 正文每段必须标出官方/媒体/未证实/作者判断并引用材料 id；模型引用了材料里没有的来源会被丢弃并记录在稿件上（页面会显示）。
- 改写某一节只替换该节的节点，其他章节原样保留；每次改动（模型生成或手动修改）都写一个 wc_article_versions 版本。
- 接口：POST /api/studio/topics/:id/article、GET /api/studio/articles/:id、POST /api/studio/articles/:id/body（可带 sectionIndex 与 instruction）、POST /api/studio/articles/:id/titles、PATCH /api/studio/articles/:id；生成类操作进队列并立刻返回。
- 新增 /studio/articles/:id 页面：正文按段落显示来源标注、标题候选、生成与重写按钮；选题详情页新增「创建稿件」入口。
- 验证：typecheck、@aihot/web build、wechathot 73/73 测试（新增 articles.test.ts 覆盖从选题建稿、正文与丢弃的来源、单节重写、标题候选、版本与接口）；Playwright 在 1440px 与 375px 检查稿件页，无横向溢出、无控制台错误。检查用数据已清理。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成正文与标题生成：选题可以创建稿件，稿件带上选题的栏目、角度、大纲和风格预设；正文按大纲分节生成，能整篇重写，也能只重写某一节（扩写、精简或调整语气），其他章节保持原样；标题给出直述型、问题型、观点型候选，可以直接选用。

正文每段都标注了它是官方说法、媒体报道、尚未证实还是作者判断，并引用材料里的来源；模型引用了证据包以外的来源会被丢弃并记在稿件上，页面会明确列出。生成和手动修改都会留下版本。

验证：npm run typecheck；npm run build -w @aihot/web；wechathot 73/73 测试通过，新增 articles.test.ts 覆盖建稿、正文与来源校验、单节重写、标题候选和版本；Playwright 在 1440px 和 375px 检查稿件页，无横向溢出、无控制台错误。
<!-- SECTION:FINAL_SUMMARY:END -->
