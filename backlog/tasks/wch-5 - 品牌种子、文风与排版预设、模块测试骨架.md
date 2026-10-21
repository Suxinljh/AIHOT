---
id: WCH-5
title: 品牌种子、文风与排版预设、模块测试骨架
status: To Do
assignee: []
created_date: '2026-10-21T03:10:00Z'
updated_date: '2026-10-21T03:49:00Z'
labels:
  - data
  - test
milestone: m-0
dependencies:
  - WCH-4
documentation:
  - docs/WeChatHot/brand-channels.md
priority: medium
type: chore
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
从 ENTITIES、PUBLISHER_DOMAINS 和行业数据生成首批 wc_brands 与候选渠道；写入内置写作风格预设和排版预设；建立模块测试骨架，覆盖迁移、投影和基础 API，测试不访问外部服务。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 首批品牌可从品牌库查询，含规范名、别名、行业和官网
- [ ] #2 内置文风与排版预设可在设置页读取
- [ ] #3 npm test 中模块测试通过，测试只连本地假服务
- [ ] #4 首批渠道包含官网新闻页、X、GitHub 和公众号候选，未确认的保持 pending
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-10-21T03:48:00Z

---

品牌与渠道核对已完成，见 docs/WeChatHot/brand-channels.md；X/公众号按 verified/user/pending 状态入库，未确认的不要标 verified。

---
<!-- COMMENTS:END -->
