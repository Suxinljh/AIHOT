---
id: WCH-30
title: 外部通知与定时摘要
status: Done
assignee: []
created_date: '2026-10-21T03:12:00Z'
updated_date: '2026-10-22T12:14:00Z'
labels:
  - backend
  - notification
milestone: m-4
dependencies:
  - WCH-15
priority: medium
type: feature
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
在站内通知之上增加飞书、邮件或 Web Push（至少两种）和立即/定时摘要；按重要性阈值、品牌、渠道和事件类型过滤，同一事件合并，记录发送状态和去重原因。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 外部通知渠道可配置并发送测试消息
- [x] #2 定时摘要按设定时间发送，重复事件不重复推送
- [x] #3 发送失败可重试并显示原因，密钥不出后端
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 飞书与邮件两个渠道，密钥留在后端。2. 立即通知与每日摘要，复用 deliveries 去重与重试。3. 重要性/事件类型/渠道过滤。4. 设置页与测试消息。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
验证：notify 测试 5/5（一次投递、阈值过滤、邮件未配置、摘要去重、测试消息）；typecheck、web 测试 25/25、npm test 666/666。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
外部通知完成：飞书+邮件、立即与每日摘要、过滤与去重、失败记录与测试消息；设置页可开关渠道和摘要时间。
<!-- SECTION:FINAL_SUMMARY:END -->
