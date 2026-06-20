---
name: digital-album-list
description: 电子画册列表页（DigitalAlbumList.jsx），展示所有已创建画册，支持创建新画册和删除
license: MIT
compatibility: opencode
---

## 路由
- `/digital-album` — 电子画册列表

## 核心功能
- 列表展示所有电子画册（卡片网格布局）
- 创建新画册 → 跳转到 `/digital-album/:newId`
- 删除画册 → `DELETE /api/album/:id`
- 展示画册的标题、封面图、创建时间

## API 调用
- `GET /api/album/list` — 获取所有电子画册列表
- `DELETE /api/album/:id` — 删除指定画册
- `POST /api/digital-album` — 创建新画册（返回 id）
