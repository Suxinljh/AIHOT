---
id: WCH-22
title: 写作风格预设
status: To Do
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - backend
  - frontend
milestone: m-2
dependencies:
  - WCH-2
priority: medium
type: feature
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现 wc_style_presets 的读取与编辑：栏目、目标读者、字数、语气、标题偏好、禁止表达；提供内置预设并允许用户新建/修改。创建选题和写作时默认套用选题栏目对应的预设，用户可临时覆盖。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 设置页可查看、编辑和新建风格预设
- [ ] #2 新建选题和写作步骤能套用预设，临时覆盖不改变预设本身
- [ ] #3 删除被使用的预设时有明确提示或回退到默认预设
<!-- AC:END -->
