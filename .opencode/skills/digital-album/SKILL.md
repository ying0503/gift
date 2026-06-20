---
name: digital-album
description: 电子画册编辑器（DigitalAlbum.jsx），核心编辑页，支持树形目录、Banner管理、画册挑选、单品/组合布局、产品参数编辑
license: MIT
compatibility: opencode
---

## 路由
- `/digital-album/:albumId?/:catId?/:itemId?/:albumDtlId?`
- 支持深层次导航：分类→页面→单品详情/组合详情

## 数据源
- `categories`（状态）— 树形结构：分类 → 页面(items) → 相册(albums) → 组合项(comboItems)
- `albums`（API）— 从 `/api/albums` 拉取的原始相册列表
- `mergedAlbums`（计算）— 合并分类树和 API 数据，用于挑选器，按 `createdAt` 倒序
- `albumMap`（计算）— `albums` 的 id→entry 映射，用于获取最新图片 URL

## 核心功能
### 左侧分类树
- 分类列表，支持展开/折叠
- 每个分类下含多个页面（item），点击选中该页面
- 增删改分类/页面

### AI 智能分类
- 调用 `POST /api/generate/categories` 一键生成 6-8 个节日礼品分类

### Banner 管理
- AI 生成（`POST /api/generate` + 轮询，通过 `globalBannerUrl` 状态跟踪）
- 本地上传（`/api/upload` → OSS）
- 重新生成
- Banner 标题支持直接编辑

### 画册挑选器
- 弹窗多选，左右两栏（未选/已选）
- 按 `createdAt` 倒序
- 支持单品和组合两种模式
- 组合最多 12 件

### 详情视图
- 单品详情：图片 + 产品参数编辑
- 组合详情：组合内卡片网格 + 组合 Banner + 产品参数
- 组合内卡片点击进入单品详情，通过 `?fromCombo=catId/itemId/comboAlbumId` 参数保留返回路径

### 产品参数编辑
- 规格（textarea）、保质期、总重量、温馨提示
- 使用 `defaultValue` + `onBlur`/`onChange` 确保可输入
- 输入后直接通过 `useCallback` 更新 `categories` 状态 + `fetch` POST 保存到后端

### 保存函数
- `save()` — 通用保存，POST `/api/digital-album`
- `updateProductParams(catId, itemId, albumId, field, value)` — 更新分类树中单品的 productParams
- `updateComboItemProductParams(catId, itemId, comboAlbumId, itemAlbumId, field, value)` — 更新组合内单品的 productParams
- `updateProductName()` / `updateComboItemProductName()` — 更新产品名称
- `removeAlbum()` — 从分类树中移除相册

### 返回导航
- 从组合内单品详情返回时使用 `?fromCombo` URL 参数回退到组合页
- 其他详情返回按分类层级回退

## 生命周期
- 初始加载: GET `/api/digital-album?id=` 加载 categories + bannerUrl
- 同时 GET `/api/albums` 加载原始画册数据
- URL 中的 `:albumDtlId` 驱动详情视图（优先从 `fromCombo` 路径的 categories 中查找，否则从 `mergedAlbums`）
