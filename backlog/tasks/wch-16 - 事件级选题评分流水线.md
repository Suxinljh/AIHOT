---
id: WCH-16
title: 事件级选题评分流水线
status: To Do
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T03:12:00Z'
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
- [ ] #1 候选事件能得到六维分数和可读解释，总分按权重计算
- [ ] #2 同一指纹不重复调用模型，人工覆盖不被自动评分覆盖
- [ ] #3 模型失败或超预算时降级为未评分，不影响事件列表
<!-- AC:END -->
