---
name: preview
description: 电子画册公开预览/分享页（Preview.jsx），无 token 公开访问，左侧绿色导航+右侧内容展示
license: MIT
compatibility: opencode
---

## 路由
- `/preview/:userId/:albumId?/:catId?/:itemAlbumId?`

## 核心功能
- 公开访问（无需 token），通过 `userId` URL 参数鉴权
- 左侧绿色分类导航，点击切换分类/页面
- 右侧内容展示区：
  - 单品详情：图片 + 产品参数（规格/保质期/重量/温馨提示）
  - 组合详情：组合内卡片网格 + 组合 Banner
  - 组合内卡片点击进入单品详情
- 产品参数只读展示

## API 调用
- `GET /api/album?id=&userId=` — 公开获取画册数据（无需 token）
- 加载画册的 categories、bannerUrl、bannerTitle

## 样式特色
- 全局绿色主题（`#52c41a` 为主色）
- 左侧边栏固定，右侧内容滚动
- 产品参数展示用红色文字标示"温馨提示"
