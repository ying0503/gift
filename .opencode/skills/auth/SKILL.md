---
name: auth
description: 认证系统（AuthContext.jsx + AuthModal.jsx），邮箱+密码注册/登录、Token管理、用户状态
license: MIT
compatibility: opencode
---

## 文件位置
- `src/AuthContext.jsx` — 认证上下文（Context + Provider）
- `src/components/AuthModal.jsx` — 登录/注册弹窗

## 认证流程
- 注册：`POST /api/register`（邮箱 + 密码）
- 登录：`POST /api/login` → 返回 `{ token, user }`
- Token 存入 `localStorage.setItem('token', token)`
- 页面加载时从 localStorage 读取 token，调用 `GET /api/me` 验证有效性
- 登出：清除 localStorage 中的 token

## AuthContext 暴露的值
```js
const { user, loading, login, register, logout, setUser } = useAuth()
```

## 密码安全
- 后端使用 PBKDF2 (SHA-256, 100000 次迭代) 哈希密码
- Token 7 天有效期

## API 基础 URL
```js
const API = 'http://localhost:3000'  // 开发时
// 生产环境通过 vite.config.js 代理 /api 请求
```
