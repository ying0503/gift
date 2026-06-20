---
name: landing-page
description: 品牌首页落地页（LandingPage.jsx），未登录用户的品牌展示页面，含导航、Hero、功能展示、案例、评价和CTA
license: MIT
compatibility: opencode
---

## 路由
- `/` — 品牌首页（未登录用户）

## 页面结构
- 顶部导航栏：Logo、导航链接（首页/功能/案例/价格/关于）、登录/注册按钮
- Hero 大图区：品牌标语、副标题、CTA 按钮
- 功能展示区：AI 智能设计 / 电子画册管理 / 批量生成 / 智能文案 等功能卡片
- 案例展示区：礼品图生成案例
- 客户评价区：用户评价展示
- 底部 CTA：扫码联系客服
- Footer

## 状态管理
- 读取 `AuthContext` 中的 `user` 判断登录状态
- 已登录用户点击 CTA 跳转 `/workbench`，未登录弹 AuthModal

## 样式
- 全内联样式，渐变背景（`linear-gradient`）、圆角卡片、box-shadow
- 响应式布局（min-width/max-width 断点）
