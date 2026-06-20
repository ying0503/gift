---
name: my-albums
description: 旧版画册列表页（MyAlbums.jsx），展示历史生成画册，支持查看和删除
license: MIT
compatibility: opencode
---

## 路由
- `/my-albums` — 旧版画册列表

## 核心功能
- 列表展示所有历史 AI 生成的画册
- 点击画册查看大图详情
- 删除画册

## 与 digital-album-list 的区别
- `digital-album-list` 管理的是电子画册（含分类树、Banner 等完整编辑结构）
- `my-albums` 展示的是 AI 生成的原画册（`/api/albums` 返回的原始数据）
- 属于旧版页面，新功能集中在 `/digital-album` 路由下
