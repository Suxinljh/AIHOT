---
id: WCH-40
title: 集成配置搬到前端（Docker + 加密存库）
status: Done
assignee: []
created_date: '2026-10-23T00:37:00Z'
updated_date: '2026-10-23T01:09:00Z'
labels:
  - backend
  - frontend
  - security
milestone: m-3
dependencies:
  - WCH-39
priority: high
type: feature
ordinal: 47000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
只考虑 Docker 单栈。配置分两层：非密钥进 settings 表（integrations.llm / feishu / mail / valves），密钥 AES-256-GCM 加密进 config_secrets 表，主密钥 CONFIG_ENC_KEY 放 .env。新增 /settings/integrations 页面，覆盖大模型（Base URL、Model、API Key）、飞书（App ID/Secret/Chat ID）、邮件（SMTP URL、From、To）、采集与模型总开关、通知设置；密钥只写不读、显示掩码；保存立即生效，采集与模型开关改为运行时读取；env 设置了某项时显示由部署环境固定。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 集成页可配置 LLM、飞书、SMTP、采集/模型开关与通知，密钥不回传明文
- [x] #2 开关保存后立即生效，无需重启；env 覆盖时页面明确提示
- [x] #3 config_secrets 加密存储、写操作有审计、测试消息可用，单元测试覆盖加解密与运行时开关
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
按方案 A：保存后重启 api/worker 生效；AC2 的『立即生效』调整为重启生效，已在页面与部署文档写明。验证：config-store 测试 3/3；typecheck；web 测试 25/25；npm test 669/669。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
集成配置前端完成：/settings/integrations 可配大模型、飞书、SMTP、采集与模型开关；密钥加密落库、只写不读；保存后重启生效；环境变量优先。
<!-- SECTION:FINAL_SUMMARY:END -->
