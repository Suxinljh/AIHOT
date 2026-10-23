---
id: WCH-45
title: 公众号图片手动上传提示与字体设置
status: Done
assignee: []
created_date: '2026-10-23T04:08:00Z'
updated_date: '2026-10-23T04:10:00Z'
labels:
  - frontend
milestone: m-3
dependencies: []
priority: medium
ordinal: 52000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
真机验收发现公众号不抓取外链/本机图片，且默认字体由公众号决定。公众号视图增加图片清单、下载链接和复制占位选项；排版和模板增加字体家族设置。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 公众号视图列出全部图片，可下载或打开
- [x] #2 复制时可选择把图片替换成占位文字
- [x] #3 文章排版和模板支持标题/正文字体
- [x] #4 typecheck、web 构建与测试通过
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 公众号视图提取图片并列出下载/打开入口。
2. 增加复制时图片替换为占位文字的选项。
3. 排版与模板增加标题/正文字体，序列化写入 font-family。
4. 更新验收清单并跑检查。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
公众号视图现在列出全部图片（含下载/打开），复制时可勾选替换成占位文字。ArticleFormat 的 title/body 增加 fontFamily，wechat-html 写入 font-family；文章排版和模板编辑都有字体输入。web 测试 25/25，npm test 676/676，web build 通过。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
公众号图片改为手动上传工作流（清单、下载、占位），排版和模板支持字体家族。
<!-- SECTION:FINAL_SUMMARY:END -->
