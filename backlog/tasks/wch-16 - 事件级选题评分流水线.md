---
id: WCH-16
title: 事件级选题评分流水线
status: Done
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T08:40:00Z'
labels:
  - backend
  - ai
  - worker
milestone: m-2
dependencies:
  - WCH-4
  - WCH-6
priority: high
type: feature
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
新增 editorialScore 模型步骤，输入事件综述、facts、最近报道、来源等级、热度、账号定位；输出重要性、相关度、读者吸引力、新颖性、时效性、资料完整性六维分数、加权总分、价值判断、推荐栏目、候选角度、资料缺口和置信度。代码按配置权重计算总分，模型只给维度和理由；按事件指纹去重、限量、记录回执和预算。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 候选事件能得到六维分数和可读解释，总分按权重计算
- [x] #2 同一指纹不重复调用模型，人工覆盖不被自动评分覆盖
- [x] #3 模型失败或超预算时降级为未评分，不影响事件列表
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
实现记录：
- 模块声明了自己的模型步骤 editorialScore（环境变量 EDITORIAL_SCORE_MODEL，可在后台模型页切换），走引擎既有的回执与预算熔断；未单独指定预设时用部署的默认模型。
- 新增 modules/wechathot/prompts.ts 与 scoring.ts：模型只给六维分数、一句话价值判断、推荐栏目、候选角度、资料缺口和置信度；总分由代码按 SCORE_WEIGHTS 计算（模型看不到权重）。
- 事件指纹由 story_id、最近更新时间、报道数、事实数和摘要算出：证据没变就不重复调用模型；有新证据才重评。
- 候选范围是「有编辑价值」的事件（至少一篇精选报道或两个独立来源），最新优先，每轮最多 10 个；人工判断过的事件（manual_decision）不再自动评分。
- 结果写入 wc_event_meta 的 editorial_score、score_dims（含 column/confidence/angles）、score_reason、score_missing、score_fingerprint、scored_at；模型失败或超预算时事件保持未评分，列表照常工作。
- 事件详情页补上推荐栏目、置信度和候选角度。
- 验证：typecheck、@aihot/web build、wechathot 52/52 测试（新增 scoring.test.ts 覆盖权重计算、指纹、只评一次、新证据重评、人工判断不覆盖、模型失败降级）；完整 npm test 783 通过 / 11 个与本任务无关的既有失败。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成事件级选题评分流水线：新增模块自己的模型步骤 editorialScore，输入事件综述、事实、最近报道、来源等级、热度和账号定位，输出重要性、账号相关度、读者吸引力、新颖性、时效性、资料完整性六个维度的分数，以及一句话价值判断、推荐栏目、候选角度、资料缺口和置信度。

总分由代码按配置权重计算，模型不参与加权；事件指纹由证据算出，同一份证据不会重复调用模型，出现新报道或新事实才重评；人工判断过的事件不会被自动评分覆盖。模型失败或超出预算时事件保持未评分，热点列表照常工作。评分每 15 分钟跑一轮，每轮最多 10 个候选事件，走引擎既有的回执与预算熔断。

验证：npm run typecheck；npm run build -w @aihot/web；wechathot 52/52 测试通过，新增 scoring.test.ts 覆盖权重、指纹、只评一次、新证据重评、人工判断与失败降级；完整 npm test 783 通过，11 个失败与本任务无关。
<!-- SECTION:FINAL_SUMMARY:END -->
