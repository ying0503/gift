---
name: model-use
description: AI 模型管理页（ModelUse.jsx），选择图片/文案生成模型，调节参数，查看模型统计
license: MIT
compatibility: opencode
---

## 路由
- `/model-use` — AI 模型参数管理

## 核心功能
### 图片生成模型选择
- MaiziAI GPT-Image-2（`maiziai-chatgpt-image-2`）
- Agnes Image 2.1 Flash（`agnes-image-2.1-flash`）
- 保存到 `localStorage.setItem('defaultImageModel', ...)`

### 文案生成模型选择
- Qwen3.5-Flash（阿里云 DashScope）
- GLM-4.6V-FlashX（智谱 BigModel）
- Doubao-Seed-2.0-mini（字节豆包火山引擎）
- 保存到 `localStorage.setItem('textGenerationModel', ...)`

### 参数调节
- 温度：0-2，保存到 `localStorage.setItem('textTemperature', ...)`
- Max Tokens：256-4096，保存到 `localStorage.setItem('textMaxTokens', ...)`

### 模型统计
- 调用 `GET /api/model-stats` 获取各模型成功率和平均响应时间
- 以进度条和文字形式展示

## 状态存储
所有配置通过 `localStorage` 持久化，供 `/workbench` 页面读取使用。
