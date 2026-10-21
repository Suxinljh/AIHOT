---
id: WCH-26
title: 文章图片上传、预览与宽度适配
status: To Do
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-21T03:12:00Z'
labels:
  - backend
  - frontend
milestone: m-3
dependencies:
  - WCH-21
priority: medium
type: feature
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现文章图片上传与预览：支持 PNG/JPG/WebP，单张上限 5MB，按内容 hash 命名存储到 AIHOT_DATA_DIR/uploads/；在编辑器中插入、替换、删除图片并设置宽度，导出时补 max-width:100%;height:auto。提示用户公众号后台可能需要手动上传图片。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 图片可上传、预览、替换和删除，刷新后仍可访问
- [ ] #2 类型/大小校验生效，非法文件返回可读错误
- [ ] #3 导出 HTML 中图片带宽度与 max-width，界面有公众号手动上传提示
<!-- AC:END -->
