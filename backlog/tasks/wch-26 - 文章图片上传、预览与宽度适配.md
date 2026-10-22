---
id: WCH-26
title: 文章图片上传、预览与宽度适配
status: Done
assignee: []
created_date: '2026-10-21T03:11:00Z'
updated_date: '2026-10-22T04:40:00Z'
labels:
  - backend
  - frontend
milestone: m-3
dependencies:
  - WCH-21
priority: medium
type: feature
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
实现文章图片上传与预览：支持 PNG/JPG/WebP，单张上限 5MB，按内容 hash 命名存储到 AIHOT_DATA_DIR/uploads/；在编辑器中插入、替换、删除图片并设置宽度，导出时补 max-width:100%;height:auto。提示用户公众号后台可能需要手动上传图片。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 图片可上传、预览、替换和删除，刷新后仍可访问
- [x] #2 类型/大小校验生效，非法文件返回可读错误
- [x] #3 导出 HTML 中图片带宽度与 max-width，界面有公众号手动上传提示
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 本地磁盘存储：.data/uploads/YYYY-MM/<uuid>.<ext>，服务端校验类型/大小/路径。2. POST /api/studio/uploads（base64 JSON），GET /api/studio/uploads/:folder/:name（管理员会话）。3. 编辑器工具栏：加粗/斜体/小标题/列表/引用/插入图片，图片写入 <img>。4. 公众号 HTML 图片 width:100%;max-width:100%；界面提示本机图片需手动上传。5. 单测覆盖存储、读取、类型/大小校验与路径穿越。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
验证：uploads 单测 3/3（存储/读取/类型/大小/穿越）；编辑器工具栏与图片插入在浏览器可用；typecheck、web 测试 21/21、npm test 643/643。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
本地磁盘图片上传完成：类型/大小校验、管理员会话读取、编辑器插入、公众号 HTML 宽度适配与手动上传提示。
<!-- SECTION:FINAL_SUMMARY:END -->
