---
id: WCH-30
title: 外部通知与定时摘要
status: To Do
assignee: []
created_date: '2026-10-21T03:12:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - backend
  - notification
milestone: m-4
dependencies:
  - WCH-15
priority: medium
type: feature
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在站内通知之上增加飞书、邮件或 Web Push（至少两种）和立即/定时摘要；按重要性阈值、品牌、渠道和事件类型过滤，同一事件合并，记录发送状态和去重原因。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 外部通知渠道可配置并发送测试消息
- [ ] #2 定时摘要按设定时间发送，重复事件不重复推送
- [ ] #3 发送失败可重试并显示原因，密钥不出后端
<!-- AC:END -->
