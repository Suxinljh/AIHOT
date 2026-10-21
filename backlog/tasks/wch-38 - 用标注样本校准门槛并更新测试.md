---
id: WCH-38
title: 用标注样本校准门槛并更新测试
status: To Do
assignee: []
created_date: '2026-10-21T03:12:00Z'
updated_date: '2026-10-21T03:49:00Z'
labels:
  - content
  - test
milestone: m-5
dependencies:
  - WCH-35
  - WCH-37
documentation:
  - docs/WeChatHot/annotation-guide.md
priority: high
type: task
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
用使用者标注的 100–200 条真实样本校准 industry/selection.ts 的门槛，记录调整前后各分类的入选数量与变化原因；更新 tests/ 中依赖示例行业分类、标签和公司的断言，确保测试结果不依赖运行机器时区。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 校准报告包含样本量、前后入选数、变化条目和判断依据
- [ ] #2 npm test 通过，测试不再引用已删除的 industry 分类
- [ ] #3 日期/时区相关测试固定时区，不因机器设置变化
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-10-21T03:49:00Z

---

样本数量、7 类配额、JSONL 字段和标注口径见 docs/WeChatHot/annotation-guide.md；最低 100 条，建议 140 条起，最终 210 条。

---
<!-- COMMENTS:END -->
